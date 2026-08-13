use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::io;
use std::path::Path;
use std::process::Command as ProcessCommand;
use std::process::ExitCode;

use clap::CommandFactory;
use clap_complete::generate;
use dialoguer::{theme::ColorfulTheme, Select};

use crate::api::{
    ApiClient, CliChangeRequest, CliChangeRequestResponse, CliConfig, CliSecret,
    CliSecretValuesResponse, CreateChangeRequestInput,
};
use crate::auth::{self, Credential};
use crate::aws::{sign_get_caller_identity, AwsCredentials};
use crate::cli::{
    AccessCommand, ApiKeysCommand, ChangeRequestsCommand, Cli, Command, ConfigsCommand,
    EnvsCommand, IdentityCommand, IdentityMethod, OrganizationsCommand, OutputFormat,
    ProjectsCommand, SecretPullFormat, SecretsCommand,
};
use crate::config::{atomic_write, AppConfig, ConfigStore};

const EXIT_SUCCESS: u8 = 0;
const EXIT_GENERIC_FAILURE: u8 = 1;
const EXIT_USAGE_OR_CONFIG: u8 = 2;
const EXIT_AUTH_REQUIRED: u8 = 3;

pub fn dispatch(cli: Cli) -> ExitCode {
    match &cli.command {
        Command::Version => version(&cli),
        Command::Doctor => doctor(&cli),
        Command::Completion { shell } => completion(shell.clone()),
        Command::Login { token_stdin } => login(&cli, *token_stdin),
        Command::Logout { purge_cache } => logout(&cli, *purge_cache),
        Command::Whoami => whoami(&cli),
        Command::Init { yes, package_json } => init(&cli, *yes, *package_json),
        Command::Organizations(command) => organizations(&cli, command),
        Command::ApiKeys(command) => api_keys(&cli, command),
        Command::Config(command) => config(command),
        Command::Projects(command) => projects(&cli, command),
        Command::Envs(command) => envs(&cli, command),
        Command::Configs(command) => configs(&cli, command),
        Command::Secrets(command) => secrets(&cli, command),
        Command::Run { command } => run(&cli, command),
        Command::ChangeRequests(command) => change_requests(&cli, command),
        Command::Access(command) => access(&cli, command),
        Command::Identity(command) => identity(&cli, command),
    }
}

fn configs(cli: &Cli, command: &ConfigsCommand) -> ExitCode {
    match command {
        ConfigsCommand::List => {
            let context = match authenticated_project_context(cli) {
                Ok(value) => value,
                Err((message, code)) => {
                    eprintln!("Error: {message}");
                    return ExitCode::from(code);
                }
            };

            match context
                .client
                .list_configs(&context.token, &context.project_id)
            {
                Ok(response) => {
                    if wants_json(cli) {
                        println!("{}", serde_json::to_string(&response).expect("json"));
                    } else if response.configs.is_empty() {
                        println!(
                            "No configs are visible for project `{}`.",
                            context.project_id
                        );
                    } else {
                        println!("Configs for {}", context.project_id);
                        for config in response.configs {
                            let marker = if context.config.as_deref() == Some(config.slug.as_str())
                                || context.config.as_deref() == Some(config.id.as_str())
                            {
                                "*"
                            } else {
                                " "
                            };
                            println!(
                                "{marker} {}\t{}\t{}\t{}\t{}",
                                config.slug,
                                config.id,
                                config.config_type,
                                config.visibility.as_deref().unwrap_or("protected"),
                                config.name
                            );
                        }
                    }
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => fail_api(error),
            }
        }
        ConfigsCommand::Select { config } => {
            match update_config(|store| store.set("config", config.to_owned())) {
                Ok(()) => {
                    println!("Selected config `{config}`.");
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => {
                    eprintln!("Error: {error}");
                    ExitCode::from(EXIT_USAGE_OR_CONFIG)
                }
            }
        }
        ConfigsCommand::Create { name, slug, parent } => {
            let resolved_slug = slug.clone().unwrap_or_else(|| slugify(name));
            if resolved_slug.is_empty() {
                eprintln!("Error: config name must contain letters or numbers.");
                return ExitCode::from(EXIT_USAGE_OR_CONFIG);
            }
            let context = match authenticated_project_context(cli) {
                Ok(value) => value,
                Err((message, code)) => {
                    eprintln!("Error: {message}");
                    return ExitCode::from(code);
                }
            };
            let environments = match context
                .client
                .list_environments(&context.token, &context.project_id)
            {
                Ok(response) => response.environments,
                Err(error) => return fail_api(error),
            };
            let Some(environment) = environments.iter().find(|environment| {
                environment.id == context.environment || environment.slug == context.environment
            }) else {
                eprintln!(
                    "Error: selected environment `{}` was not found.",
                    context.environment
                );
                return ExitCode::from(EXIT_USAGE_OR_CONFIG);
            };
            let configs = match context
                .client
                .list_configs(&context.token, &context.project_id)
            {
                Ok(response) => response.configs,
                Err(error) => return fail_api(error),
            };
            let parent_config = if let Some(parent) = parent.as_deref() {
                configs
                    .iter()
                    .find(|config| config.id == parent || config.slug == parent)
            } else {
                configs.iter().find(|config| {
                    config.environment_id == environment.id && config.config_type == "root"
                })
            };
            let Some(parent_config) = parent_config else {
                eprintln!(
                    "Error: parent config was not found for `{}`.",
                    environment.slug
                );
                return ExitCode::from(EXIT_USAGE_OR_CONFIG);
            };
            if parent_config.environment_id != environment.id {
                eprintln!("Error: parent config belongs to another environment.");
                return ExitCode::from(EXIT_USAGE_OR_CONFIG);
            }

            match context.client.create_config(
                &context.token,
                &context.project_id,
                &environment.id,
                name,
                &resolved_slug,
                Some(&parent_config.id),
            ) {
                Ok(response) => {
                    if let Err(error) =
                        update_config(|config| config.set("config", response.config.slug.clone()))
                    {
                        eprintln!("Warning: config created, but selection was not saved: {error}");
                    }
                    if wants_json(cli) {
                        println!("{}", serde_json::to_string(&response).expect("json"));
                    } else {
                        println!("Created and selected config `{}`.", response.config.slug);
                    }
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => fail_api(error),
            }
        }
        ConfigsCommand::Diff { target } => {
            let context = match authenticated_project_context(cli) {
                Ok(value) => value,
                Err((message, code)) => {
                    eprintln!("Error: {message}");
                    return ExitCode::from(code);
                }
            };
            let Some(source_selector) = context.config.as_deref() else {
                eprintln!("Error: select a source config before running diff.");
                return ExitCode::from(EXIT_USAGE_OR_CONFIG);
            };
            let configs = match context
                .client
                .list_configs(&context.token, &context.project_id)
            {
                Ok(response) => response.configs,
                Err(error) => return fail_api(error),
            };
            let Some(source) = find_config(&configs, source_selector) else {
                eprintln!("Error: source config `{source_selector}` was not found.");
                return ExitCode::from(EXIT_USAGE_OR_CONFIG);
            };
            let target_config = target
                .as_deref()
                .and_then(|target| find_config(&configs, target))
                .or_else(|| {
                    configs.iter().find(|config| {
                        config.environment_id == source.environment_id
                            && config.config_type == "root"
                    })
                });
            let Some(target_config) = target_config else {
                eprintln!("Error: target config was not found.");
                return ExitCode::from(EXIT_USAGE_OR_CONFIG);
            };
            let source_secrets = match context.client.list_secrets(
                &context.token,
                &context.project_id,
                &context.environment,
                Some(&source.id),
            ) {
                Ok(response) => response.secrets,
                Err(error) => return fail_api(error),
            };
            let target_secrets = match context.client.list_secrets(
                &context.token,
                &context.project_id,
                &context.environment,
                Some(&target_config.id),
            ) {
                Ok(response) => response.secrets,
                Err(error) => return fail_api(error),
            };
            print_config_diff(cli, source, target_config, source_secrets, target_secrets)
        }
    }
}

fn change_requests(cli: &Cli, command: &ChangeRequestsCommand) -> ExitCode {
    let context = match authenticated_project_context(cli) {
        Ok(value) => value,
        Err((message, code)) => {
            eprintln!("Error: {message}");
            return ExitCode::from(code);
        }
    };

    match command {
        ChangeRequestsCommand::List => match context
            .client
            .list_change_requests(&context.token, &context.project_id)
        {
            Ok(response) => {
                if wants_json(cli) {
                    println!("{}", serde_json::to_string(&response).expect("json"));
                } else if response.requests.is_empty() {
                    println!("No change requests found.");
                } else {
                    for request in response.requests {
                        print_change_request(&request);
                    }
                }
                ExitCode::from(EXIT_SUCCESS)
            }
            Err(error) => fail_api(error),
        },
        ChangeRequestsCommand::Create {
            config,
            target,
            title,
            description,
            secrets,
            all,
        } => {
            let configs = match context
                .client
                .list_configs(&context.token, &context.project_id)
            {
                Ok(response) => response.configs,
                Err(error) => return fail_api(error),
            };
            let Some(source) = find_config(&configs, config) else {
                eprintln!("Error: source config `{config}` was not found.");
                return ExitCode::from(EXIT_USAGE_OR_CONFIG);
            };
            let Some(target_config) = find_config(&configs, target) else {
                eprintln!("Error: target config `{target}` was not found.");
                return ExitCode::from(EXIT_USAGE_OR_CONFIG);
            };
            let title = title
                .clone()
                .unwrap_or_else(|| format!("Merge {} into {}", source.slug, target_config.slug));
            let all_keys = *all || secrets.is_empty();
            match context.client.create_change_request(
                &context.token,
                &context.project_id,
                CreateChangeRequestInput {
                    source_config_id: &source.id,
                    target_config_id: Some(&target_config.id),
                    title: &title,
                    description: description.as_deref(),
                    all_keys,
                    secret_names: secrets,
                },
            ) {
                Ok(response) => print_change_request_response(cli, response),
                Err(error) => fail_api(error),
            }
        }
        ChangeRequestsCommand::Approve { id } => {
            change_request_action(cli, &context, id, "approve")
        }
        ChangeRequestsCommand::Merge { id } => change_request_action(cli, &context, id, "merge"),
        ChangeRequestsCommand::Cancel { id } => change_request_action(cli, &context, id, "cancel"),
    }
}

fn find_config<'a>(configs: &'a [CliConfig], selector: &str) -> Option<&'a CliConfig> {
    configs
        .iter()
        .find(|config| config.id == selector || config.slug == selector)
}

fn print_config_diff(
    cli: &Cli,
    source: &CliConfig,
    target: &CliConfig,
    source_secrets: Vec<CliSecret>,
    target_secrets: Vec<CliSecret>,
) -> ExitCode {
    let source_by_name = source_secrets
        .into_iter()
        .map(|secret| (secret.name.clone(), secret))
        .collect::<BTreeMap<_, _>>();
    let target_by_name = target_secrets
        .into_iter()
        .map(|secret| (secret.name.clone(), secret))
        .collect::<BTreeMap<_, _>>();
    let names = source_by_name
        .keys()
        .chain(target_by_name.keys())
        .cloned()
        .collect::<BTreeSet<_>>();
    let changes = names
        .into_iter()
        .map(|name| {
            let source_secret = source_by_name.get(&name);
            let target_secret = target_by_name.get(&name);
            let status = match (source_secret, target_secret) {
                (Some(_), None) => "added",
                (None, Some(_)) => "removed",
                (Some(left), Some(right))
                    if left.current_version_id != right.current_version_id
                        || left.status != right.status
                        || left.mode != right.mode =>
                {
                    "changed"
                }
                _ => "unchanged",
            };
            serde_json::json!({
                "name": name,
                "status": status,
                "sourceVersion": source_secret.and_then(|secret| secret.version),
                "targetVersion": target_secret.and_then(|secret| secret.version),
            })
        })
        .collect::<Vec<_>>();

    if wants_json(cli) {
        println!(
            "{}",
            serde_json::json!({
                "source": { "id": source.id, "slug": source.slug },
                "target": { "id": target.id, "slug": target.slug },
                "changes": changes,
            })
        );
    } else {
        println!("Config diff: {} -> {}", source.slug, target.slug);
        let mut visible = 0;
        for change in &changes {
            let status = change["status"].as_str().unwrap_or("unchanged");
            if status == "unchanged" {
                continue;
            }
            visible += 1;
            let marker = match status {
                "added" => "+",
                "removed" => "-",
                _ => "~",
            };
            println!(
                "{marker} {} ({status})",
                change["name"].as_str().unwrap_or("unknown")
            );
        }
        if visible == 0 {
            println!("No metadata differences.");
        } else {
            println!("{visible} changed secret(s); values were not downloaded.");
        }
    }
    ExitCode::from(EXIT_SUCCESS)
}

fn change_request_action(
    cli: &Cli,
    context: &ProjectContext,
    request_id: &str,
    action: &str,
) -> ExitCode {
    match context.client.change_request_action(
        &context.token,
        &context.project_id,
        request_id,
        action,
    ) {
        Ok(response) => print_change_request_response(cli, response),
        Err(error) => fail_api(error),
    }
}

fn print_change_request_response(cli: &Cli, response: CliChangeRequestResponse) -> ExitCode {
    if wants_json(cli) {
        println!("{}", serde_json::to_string(&response).expect("json"));
    } else {
        print_change_request(&response.request);
    }
    ExitCode::from(EXIT_SUCCESS)
}

fn print_change_request(request: &CliChangeRequest) {
    println!(
        "{}\t{}\t{} -> {}\t{}",
        request.id,
        request.status,
        request.source_config_id,
        request.target_config_id,
        request.title
    );
}

fn access(cli: &Cli, command: &AccessCommand) -> ExitCode {
    let (client, token) = match authenticated_client(cli) {
        Ok(value) => value,
        Err((message, code)) => {
            eprintln!("Error: {message}");
            return ExitCode::from(code);
        }
    };

    match command {
        AccessCommand::Request { message } => {
            let project_id = match resolve_project(cli) {
                Ok(value) => value,
                Err(error) => return fail_prompt(error),
            };
            match client.create_access_request(&token, &project_id, message.as_deref()) {
                Ok(response) => {
                    if wants_json(cli) {
                        println!("{}", serde_json::to_string(&response).expect("json"));
                    } else {
                        println!(
                            "Access request `{}` created for project `{}`.",
                            response.request.id, response.request.project_id
                        );
                        println!("Status: {}", response.request.status);
                    }
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => fail_api(error),
            }
        }
        AccessCommand::Status {
            status,
            all_projects,
        } => {
            let project_id = if *all_projects {
                None
            } else {
                resolve_project(cli).ok()
            };
            match client.list_access_requests(
                &token,
                project_id.as_deref(),
                status.as_ref().map(|status| status.as_api_value()),
            ) {
                Ok(response) => {
                    if wants_json(cli) {
                        println!("{}", serde_json::to_string(&response).expect("json"));
                    } else if response.requests.is_empty() {
                        println!("No matching access requests.");
                    } else {
                        for request in response.requests {
                            println!(
                                "{}\t{}\t{}\t{}",
                                request.id, request.status, request.project_id, request.created_at
                            );
                        }
                    }
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => fail_api(error),
            }
        }
        AccessCommand::Cancel { id } => match client.cancel_access_request(&token, id) {
            Ok(response) => {
                if wants_json(cli) {
                    println!("{}", serde_json::to_string(&response).expect("json"));
                } else {
                    println!("Cancelled access request `{}`.", response.request_id);
                }
                ExitCode::from(EXIT_SUCCESS)
            }
            Err(error) => fail_api(error),
        },
    }
}

fn version(cli: &Cli) -> ExitCode {
    if cli.json {
        println!(
            "{}",
            serde_json::json!({
                "name": "pv",
                "version": env!("CARGO_PKG_VERSION"),
            })
        );
    } else {
        println!("pv {}", env!("CARGO_PKG_VERSION"));
    }

    ExitCode::from(EXIT_SUCCESS)
}

fn doctor(cli: &Cli) -> ExitCode {
    let config_path = ConfigStore::effective()
        .map(|store| store.path().display().to_string())
        .unwrap_or_else(|error| format!("unavailable: {error}"));
    let auth_status = auth::effective_credential()
        .map(|credential| match credential {
            Some(Credential::EnvironmentToken) => "environment",
            Some(Credential::StoredToken) => "credential-store",
            None => "not-authenticated",
        })
        .unwrap_or("credential-store-unavailable");
    let config_result = ConfigStore::load_resolved();
    let api_result = config_result
        .as_ref()
        .map_err(Clone::clone)
        .and_then(|config| {
            let configured_url = cli.api_url.as_ref().or(config.api_url.as_ref());
            ApiClient::new(configured_url.map(String::as_str), cli.allow_insecure_http).map(|_| ())
        });
    let diagnostics_ok = config_result.is_ok() && api_result.is_ok();
    let auth_check_status = if matches!(auth_status, "not-authenticated") {
        "needs_setup"
    } else if matches!(auth_status, "credential-store-unavailable") {
        "warning"
    } else {
        "ok"
    };
    let auth_message = if matches!(auth_status, "not-authenticated") {
        "Run `pv login` for browser-approved device authentication."
    } else {
        "A credential source is available."
    };
    let config_message = config_result
        .as_ref()
        .map(|_| "Configuration parsed successfully.".to_owned())
        .unwrap_or_else(|error| error.clone());
    let api_message = api_result
        .as_ref()
        .map(|_| "API URL is valid.".to_owned())
        .unwrap_or_else(|error| error.clone());

    if cli.json {
        println!(
            "{}",
            serde_json::json!({
                "status": if diagnostics_ok { "ok" } else { "error" },
                "configPath": config_path,
                "auth": auth_status,
                "checks": [
                    {
                        "name": "cli",
                        "status": "ok",
                        "message": "CLI is installed."
                    },
                    {
                        "name": "config",
                        "status": if config_result.is_ok() { "ok" } else { "error" },
                        "message": config_message
                    },
                    {
                        "name": "api-url",
                        "status": if api_result.is_ok() { "ok" } else { "error" },
                        "message": api_message
                    },
                    {
                        "name": "auth",
                        "status": auth_check_status,
                        "message": auth_message
                    },
                    {
                        "name": "offline-cache",
                        "status": "disabled",
                        "message": "Disabled until the API provides revocable leases and revision checks."
                    }
                ]
            })
        );
    } else {
        println!("PentaVault CLI doctor");
        println!("Status: {}", if diagnostics_ok { "ok" } else { "error" });
        println!("CLI: installed");
        println!("Config: {config_path}");
        println!("API URL: {api_message}");
        println!("Auth: {auth_status}");
        println!("Offline cache: disabled (awaiting revocable leases)");
    }

    ExitCode::from(if diagnostics_ok {
        EXIT_SUCCESS
    } else {
        EXIT_USAGE_OR_CONFIG
    })
}

fn login(cli: &Cli, token_stdin: bool) -> ExitCode {
    if token_stdin {
        return match auth::store_token_from_stdin(io::stdin()) {
            Ok(()) => {
                println!("Stored PentaVault credential in the OS credential store.");
                ExitCode::from(EXIT_SUCCESS)
            }
            Err(error) => {
                eprintln!("Error: {error}");
                ExitCode::from(EXIT_GENERIC_FAILURE)
            }
        };
    }

    login_with_device_code(cli)
}

fn login_with_device_code(cli: &Cli) -> ExitCode {
    let api_url = match resolve_api_url(cli) {
        Ok(value) => value,
        Err(error) => {
            eprintln!("Error: {error}");
            return ExitCode::from(EXIT_USAGE_OR_CONFIG);
        }
    };
    let client = match ApiClient::new(api_url.as_deref(), cli.allow_insecure_http) {
        Ok(client) => client,
        Err(error) => {
            eprintln!("Error: {error}");
            return ExitCode::from(EXIT_USAGE_OR_CONFIG);
        }
    };
    let device_code = match client.request_device_code() {
        Ok(code) => code,
        Err(error) => {
            eprintln!("Error: {error}");
            return ExitCode::from(EXIT_GENERIC_FAILURE);
        }
    };
    println!("PentaVault CLI login");
    println!(
        "Open: {}",
        client.display_url(&device_code.verification_uri)
    );
    println!("Code: {}", format_device_code(&device_code.user_code));
    println!();
    println!("Waiting for approval...");

    match client.wait_for_device_token(&device_code) {
        Ok(token) => match auth::store_token(&token) {
            Ok(()) => {
                println!(
                    "Login complete. Stored PentaVault credential in the OS credential store."
                );
                ExitCode::from(EXIT_SUCCESS)
            }
            Err(error) => {
                eprintln!("Error: {error}");
                ExitCode::from(EXIT_GENERIC_FAILURE)
            }
        },
        Err(error) => {
            eprintln!("Error: {error}");
            ExitCode::from(EXIT_GENERIC_FAILURE)
        }
    }
}

fn logout(cli: &Cli, purge_cache: bool) -> ExitCode {
    let credential = match auth::effective_credential() {
        Ok(value) => value,
        Err(error) => {
            eprintln!("Error: {error}");
            return ExitCode::from(EXIT_GENERIC_FAILURE);
        }
    };

    if matches!(credential, Some(Credential::EnvironmentToken)) {
        eprintln!("Error: PENTAVAULT_TOKEN is active and cannot be removed by the CLI.");
        eprintln!("Unset PENTAVAULT_TOKEN in this shell to log out.");
        return ExitCode::from(EXIT_USAGE_OR_CONFIG);
    }

    if matches!(credential, Some(Credential::StoredToken)) {
        if let Ok((client, token)) = authenticated_client(cli) {
            match client.session(&token) {
                Ok(session) => {
                    if let Some(session_id) = session.session.id {
                        if let Err(error) = client.revoke_cli_session(&token, &session_id) {
                            eprintln!("Warning: remote session could not be revoked: {error}");
                        }
                    }
                }
                Err(error) => eprintln!("Warning: remote session could not be checked: {error}"),
            }
        }
    }

    if let Err(error) = auth::delete_stored_token() {
        eprintln!("Error: {error}");
        return ExitCode::from(EXIT_GENERIC_FAILURE);
    }

    println!("Removed stored PentaVault credential.");
    if purge_cache {
        println!("No local secret cache exists; nothing else to purge.");
    }

    ExitCode::from(EXIT_SUCCESS)
}

fn whoami(cli: &Cli) -> ExitCode {
    let (client, token) = match authenticated_client(cli) {
        Ok(value) => value,
        Err((message, code)) => {
            eprintln!("Error: {message}");
            return ExitCode::from(code);
        }
    };
    let source = match auth::effective_credential() {
        Ok(Some(Credential::EnvironmentToken)) => "environment",
        Ok(Some(Credential::StoredToken)) => "credential-store",
        Ok(None) => "unknown",
        Err(error) => {
            eprintln!("Error: {error}");
            return ExitCode::from(EXIT_GENERIC_FAILURE);
        }
    };

    match client.session(&token) {
        Ok(session) => {
            if wants_json(cli) {
                println!(
                    "{}",
                    serde_json::json!({
                        "authenticated": true,
                        "source": source,
                        "session": session.session,
                        "user": session.user,
                    })
                );
            } else {
                let display_name = session
                    .user
                    .name
                    .as_deref()
                    .or(session.user.username.as_deref())
                    .or(session.user.email.as_deref())
                    .unwrap_or("PentaVault user");
                println!("{display_name}");
                if let Some(email) = session.user.email.as_deref() {
                    println!("Email: {email}");
                }
                println!("Credential: {source}");
                println!(
                    "Organization: {}",
                    session
                        .session
                        .active_organization_slug
                        .as_deref()
                        .or(session.session.active_organization_id.as_deref())
                        .unwrap_or("not selected")
                );
                println!(
                    "MFA: {}",
                    if session.user.two_factor_enabled {
                        "enabled"
                    } else {
                        "disabled"
                    }
                );
            }
            ExitCode::from(EXIT_SUCCESS)
        }
        Err(error) => fail_api(error),
    }
}

fn organizations(cli: &Cli, command: &OrganizationsCommand) -> ExitCode {
    let (client, token) = match authenticated_client(cli) {
        Ok(value) => value,
        Err((message, code)) => {
            eprintln!("Error: {message}");
            return ExitCode::from(code);
        }
    };

    match command {
        OrganizationsCommand::List => match client.list_organizations(&token) {
            Ok(response) => {
                if wants_json(cli) {
                    println!("{}", serde_json::to_string(&response).expect("json"));
                } else if response.organizations.is_empty() {
                    println!("No organizations are available for this account.");
                } else {
                    println!("Organizations ({})", response.organizations.len());
                    for entry in response.organizations {
                        let marker = if entry.organization.active { "*" } else { " " };
                        println!(
                            "{marker} {}\t{}\t{}\t{}",
                            entry.organization.id,
                            entry.organization.slug,
                            entry.membership.role,
                            entry.organization.name
                        );
                    }
                }
                ExitCode::from(EXIT_SUCCESS)
            }
            Err(error) => fail_api(error),
        },
        OrganizationsCommand::Select { organization } => {
            match client.set_active_organization(&token, organization) {
                Ok(response) => {
                    if let Err(error) =
                        update_config(|config| config.set("organization", organization.to_owned()))
                    {
                        eprintln!("Warning: organization changed remotely but local config failed: {error}");
                    }
                    if wants_json(cli) {
                        println!("{}", serde_json::to_string(&response).expect("json"));
                    } else {
                        println!(
                            "Selected organization `{}`.",
                            response
                                .active_organization_slug
                                .as_deref()
                                .or(response.active_organization_id.as_deref())
                                .unwrap_or(organization)
                        );
                    }
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => fail_api(error),
            }
        }
    }
}

fn api_keys(cli: &Cli, command: &ApiKeysCommand) -> ExitCode {
    let (client, token) = match authenticated_client(cli) {
        Ok(value) => value,
        Err((message, code)) => {
            eprintln!("Error: {message}");
            return ExitCode::from(code);
        }
    };
    if token.starts_with("pvk_") {
        eprintln!("Error: an API key cannot manage other API keys.");
        eprintln!("Run `pv login` to use a browser-approved session, then retry.");
        return ExitCode::from(EXIT_AUTH_REQUIRED);
    }

    match command {
        ApiKeysCommand::List => match client.list_api_keys(&token) {
            Ok(response) => {
                if wants_json(cli) {
                    println!("{}", serde_json::to_string(&response).expect("json"));
                } else if response.api_keys.is_empty() {
                    println!("No API keys found.");
                } else {
                    println!("API keys ({})", response.api_keys.len());
                    for key in response.api_keys {
                        println!(
                            "{}\t{}\t{}\t{}\t{}",
                            key.id,
                            key.prefix
                                .as_deref()
                                .or(key.start.as_deref())
                                .unwrap_or("-"),
                            key.token_type,
                            if key.enabled { "active" } else { "revoked" },
                            key.name.as_deref().unwrap_or("unnamed")
                        );
                    }
                }
                ExitCode::from(EXIT_SUCCESS)
            }
            Err(error) => fail_api(error),
        },
        ApiKeysCommand::Create {
            name,
            r#type,
            organization,
            permissions,
        } => match client.create_api_key(
            &token,
            name.as_deref(),
            r#type.as_api_value(),
            organization.as_deref(),
            &if permissions.is_empty() {
                vec!["read"]
            } else {
                permissions
                    .iter()
                    .map(crate::cli::ApiKeyPermission::as_api_value)
                    .collect()
            },
        ) {
            Ok(response) => {
                if wants_json(cli) {
                    println!("{}", serde_json::to_string(&response).expect("json"));
                } else {
                    println!("API key created. It will be shown once.");
                    println!("Header: {}", response.header_name);
                    println!("Key: {}", response.key);
                    if let Some(id) = response.api_key.id {
                        println!("ID: {id}");
                    }
                    println!("Store it in your OS credential store or CI secret vault now.");
                }
                ExitCode::from(EXIT_SUCCESS)
            }
            Err(error) => fail_api(error),
        },
        ApiKeysCommand::Revoke { id } => match client.revoke_api_key(&token, id) {
            Ok(response) => {
                if wants_json(cli) {
                    println!("{}", serde_json::to_string(&response).expect("json"));
                } else {
                    println!("Revoked API key `{}`.", response.api_key_id);
                }
                ExitCode::from(EXIT_SUCCESS)
            }
            Err(error) => fail_api(error),
        },
    }
}

fn init(cli: &Cli, yes: bool, package_json: bool) -> ExitCode {
    let (client, token) = match authenticated_client(cli) {
        Ok(value) => value,
        Err((message, code)) => {
            eprintln!("Error: {message}");
            return ExitCode::from(code);
        }
    };
    let session = match client.session(&token) {
        Ok(value) => value,
        Err(error) => return fail_api(error),
    };
    let organizations = match client.list_organizations(&token) {
        Ok(value) if !value.organizations.is_empty() => value.organizations,
        Ok(_) => {
            eprintln!("Error: no organization is available for this account.");
            return ExitCode::from(EXIT_USAGE_OR_CONFIG);
        }
        Err(error) => return fail_api(error),
    };

    let display_name = session
        .user
        .name
        .as_deref()
        .or(session.user.username.as_deref())
        .or(session.user.email.as_deref())
        .unwrap_or("king");
    println!("PentaVault\nWelcome, {display_name}.\n");
    println!("Organizations: {}", organizations.len());

    let organization_labels = organizations
        .iter()
        .map(|entry| {
            format!(
                "{} ({}) [{}]",
                entry.organization.name, entry.organization.slug, entry.membership.role
            )
        })
        .collect::<Vec<_>>();
    let active_organization = organizations
        .iter()
        .position(|entry| entry.organization.active)
        .unwrap_or(0);
    let organization_index = match choose(
        "Select organization",
        &organization_labels,
        active_organization,
        yes,
    ) {
        Ok(value) => value,
        Err(error) => return fail_prompt(error),
    };
    let organization = &organizations[organization_index].organization;
    if !organization.active {
        if let Err(error) = client.set_active_organization(&token, &organization.id) {
            return fail_api(error);
        }
    }

    let projects = match client.list_projects(&token) {
        Ok(value) if !value.projects.is_empty() => value.projects,
        Ok(_) => {
            eprintln!(
                "Error: no accessible project exists in `{}`.",
                organization.name
            );
            return ExitCode::from(EXIT_USAGE_OR_CONFIG);
        }
        Err(error) => return fail_api(error),
    };
    let project_labels = projects
        .iter()
        .map(|project| {
            format!(
                "{} ({}) [{}]",
                project.name,
                project.slug,
                project.role.as_deref().unwrap_or("member")
            )
        })
        .collect::<Vec<_>>();
    let project_index = match choose("Select project", &project_labels, 0, yes) {
        Ok(value) => value,
        Err(error) => return fail_prompt(error),
    };
    let project = &projects[project_index];

    let environments = match client.list_environments(&token, &project.id) {
        Ok(value) if !value.environments.is_empty() => value.environments,
        Ok(_) => {
            eprintln!("Error: project `{}` has no environments.", project.name);
            return ExitCode::from(EXIT_USAGE_OR_CONFIG);
        }
        Err(error) => return fail_api(error),
    };
    let environment_labels = environments
        .iter()
        .map(|environment| format!("{} ({})", environment.name, environment.slug))
        .collect::<Vec<_>>();
    let default_environment = environments
        .iter()
        .position(|environment| environment.is_default)
        .unwrap_or(0);
    let environment_index = match choose(
        "Select environment",
        &environment_labels,
        default_environment,
        yes,
    ) {
        Ok(value) => value,
        Err(error) => return fail_prompt(error),
    };
    let environment = &environments[environment_index];

    let configs = match client.list_configs(&token, &project.id) {
        Ok(value) => value
            .configs
            .into_iter()
            .filter(|config| config.environment_id == environment.id)
            .collect::<Vec<_>>(),
        Err(error) => return fail_api(error),
    };
    let selected_config = if configs.is_empty() {
        None
    } else {
        let config_labels = configs
            .iter()
            .map(|config| format!("{} ({}) [{}]", config.name, config.slug, config.config_type))
            .collect::<Vec<_>>();
        let default_config = configs
            .iter()
            .position(|config| {
                config.is_personal_default.unwrap_or(false) || config.config_type == "root"
            })
            .unwrap_or(0);
        let index = match choose("Select config", &config_labels, default_config, yes) {
            Ok(value) => value,
            Err(error) => return fail_prompt(error),
        };
        Some(&configs[index])
    };

    let current_directory = match std::env::current_dir() {
        Ok(value) => value,
        Err(error) => return fail_prompt(format!("unable to resolve current directory: {error}")),
    };
    let store = ConfigStore::project(&current_directory);
    let config = AppConfig {
        api_url: resolve_api_url(cli).ok().flatten(),
        organization: Some(organization.id.clone()),
        project: Some(project.id.clone()),
        environment: Some(environment.slug.clone()),
        config: selected_config.map(|config| config.slug.clone()),
        format: None,
    };
    if let Err(error) = store.save(&config) {
        return fail_prompt(error);
    }
    if package_json {
        if let Err(error) = add_package_scripts(&current_directory) {
            return fail_prompt(error);
        }
    }

    println!("\nConfigured {}.", store.path().display());
    println!("Organization: {}", organization.name);
    println!("Project: {}", project.name);
    println!("Environment: {}", environment.slug);
    if let Some(config) = selected_config {
        println!("Config: {}", config.slug);
    }
    println!("Next: pv secrets list");
    ExitCode::from(EXIT_SUCCESS)
}

fn choose(prompt: &str, items: &[String], default: usize, yes: bool) -> Result<usize, String> {
    if items.is_empty() {
        return Err(format!("{prompt} has no choices"));
    }
    if yes || items.len() == 1 {
        return Ok(default.min(items.len() - 1));
    }
    Select::with_theme(&ColorfulTheme::default())
        .with_prompt(prompt)
        .items(items)
        .default(default.min(items.len() - 1))
        .interact()
        .map_err(|error| format!("prompt cancelled: {error}"))
}

fn add_package_scripts(directory: &Path) -> Result<(), String> {
    let path = directory.join("package.json");
    if !path.is_file() {
        return Err("--package-json was requested, but package.json was not found".to_owned());
    }
    let contents = fs::read_to_string(&path)
        .map_err(|error| format!("unable to read package.json: {error}"))?;
    let mut value = serde_json::from_str::<serde_json::Value>(&contents)
        .map_err(|error| format!("unable to parse package.json: {error}"))?;
    let object = value
        .as_object_mut()
        .ok_or_else(|| "package.json must contain an object".to_owned())?;
    let scripts = object
        .entry("scripts")
        .or_insert_with(|| serde_json::json!({}))
        .as_object_mut()
        .ok_or_else(|| "package.json scripts must contain an object".to_owned())?;
    scripts
        .entry("secrets:pull")
        .or_insert_with(|| serde_json::json!("pv secrets pull"));
    scripts
        .entry("secrets:run")
        .or_insert_with(|| serde_json::json!("pv run --"));
    let formatted = serde_json::to_string_pretty(&value)
        .map_err(|error| format!("unable to serialize package.json: {error}"))?;
    atomic_write(&path, format!("{formatted}\n").as_bytes())
}

/// Reads a federated assertion from a file, stdin, or an environment variable.
///
/// Never from an argument: a command line is visible to every process on the
/// host and is routinely captured in CI logs and shell history.
fn read_assertion(
    assertion_file: Option<&str>,
    assertion_env: Option<&str>,
) -> Result<String, String> {
    let raw = match (assertion_file, assertion_env) {
        (Some("-"), _) => {
            let mut buffer = String::new();
            io::Read::read_to_string(&mut io::stdin(), &mut buffer)
                .map_err(|error| format!("unable to read the assertion from stdin: {error}"))?;
            buffer
        }
        (Some(path), _) => fs::read_to_string(path)
            .map_err(|error| format!("unable to read the assertion from `{path}`: {error}"))?,
        (None, Some(name)) => {
            std::env::var(name).map_err(|_| format!("environment variable `{name}` is not set"))?
        }
        (None, None) => return Err(
            "provide the assertion with --assertion-file (use `-` for stdin) or --assertion-env"
                .to_owned(),
        ),
    };

    let assertion = raw.trim().to_owned();
    if assertion.is_empty() {
        return Err("the assertion is empty".to_owned());
    }
    Ok(assertion)
}

fn identity(cli: &Cli, command: &IdentityCommand) -> ExitCode {
    let api_url = match resolve_api_url(cli) {
        Ok(value) => value,
        Err(error) => return fail_prompt(error),
    };
    let client = match ApiClient::new(api_url.as_deref(), cli.allow_insecure_http) {
        Ok(value) => value,
        Err(error) => return fail_prompt(error),
    };

    match command {
        IdentityCommand::Login {
            organization,
            name,
            method,
            assertion_file,
            assertion_env,
            audience,
            sts_region,
            token_only,
        } => {
            let outcome = match method {
                IdentityMethod::Jwt => {
                    match read_assertion(assertion_file.as_deref(), assertion_env.as_deref()) {
                        Ok(assertion) => client.identity_login(organization, name, &assertion),
                        Err(error) => return fail_prompt(error),
                    }
                }
                IdentityMethod::Aws => {
                    let audience = match audience.as_deref().map(str::trim).filter(|v| !v.is_empty())
                    {
                        Some(value) => value,
                        None => {
                            return fail_prompt(
                                "--audience is required with --method aws; it must match the value configured on the auth method"
                                    .to_owned(),
                            )
                        }
                    };
                    // The region is only ever read from the flag or AWS_REGION,
                    // never inferred: signing for the wrong region produces a
                    // signature the server refuses before it reaches AWS.
                    let region = sts_region
                        .as_deref()
                        .map(str::trim)
                        .filter(|value| !value.is_empty());

                    let credentials = match AwsCredentials::from_env() {
                        Ok(value) => value,
                        Err(error) => return fail_prompt(error),
                    };
                    match sign_get_caller_identity(&credentials, region, audience) {
                        Ok(signed) => client.identity_login_aws(organization, name, &signed),
                        Err(error) => return fail_prompt(error),
                    }
                }
            };

            match outcome {
                Ok(response) => {
                    if *token_only {
                        println!("{}", response.access_token);
                    } else if wants_json(cli) {
                        println!("{}", serde_json::to_string(&response).expect("json"));
                    } else {
                        // The token goes to stdout and nowhere else. It expires in
                        // minutes and belongs to this process, so writing it to the
                        // credential store would outlive its usefulness while
                        // leaving a usable credential on disk.
                        println!("{}", response.access_token);
                        eprintln!("Identity: {}", response.identity_id);
                        eprintln!("Expires:  {}", response.expires_at);
                        eprintln!("Projects: {}", response.project_ids.join(", "));
                    }
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => fail_api(error),
            }
        }
        IdentityCommand::Whoami { token } => {
            let token = match token
                .clone()
                .or_else(|| std::env::var("PENTAVAULT_TOKEN").ok())
                .map(|value| value.trim().to_owned())
                .filter(|value| !value.is_empty())
            {
                Some(value) => value,
                None => {
                    return fail_prompt(
                        "provide an identity token with --token or PENTAVAULT_TOKEN".to_owned(),
                    )
                }
            };

            match client.identity_context(&token) {
                Ok(response) => {
                    if wants_json(cli) {
                        println!("{}", serde_json::to_string(&response).expect("json"));
                    } else {
                        println!("Identity: {}", response.identity_id);
                        println!("Subject:  {}", response.subject);
                        println!("Expires:  {}", response.expires_at);
                        println!("Projects: {}", response.project_ids.join(", "));
                    }
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => fail_api(error),
            }
        }
    }
}

fn fail_prompt(error: String) -> ExitCode {
    eprintln!("Error: {error}");
    ExitCode::from(EXIT_USAGE_OR_CONFIG)
}

fn config(command: &crate::cli::ConfigCommand) -> ExitCode {
    let store = match ConfigStore::effective() {
        Ok(store) => store,
        Err(error) => {
            eprintln!("Error: {error}");
            return ExitCode::from(EXIT_GENERIC_FAILURE);
        }
    };

    match command {
        crate::cli::ConfigCommand::Get { key } => {
            match store.load().and_then(|config| config.value(key)) {
                Ok(Some(value)) => {
                    println!("{value}");
                    ExitCode::from(EXIT_SUCCESS)
                }
                Ok(None) => {
                    eprintln!("Error: config key `{key}` is not set.");
                    ExitCode::from(EXIT_USAGE_OR_CONFIG)
                }
                Err(error) => {
                    eprintln!("Error: {error}");
                    ExitCode::from(EXIT_GENERIC_FAILURE)
                }
            }
        }
        crate::cli::ConfigCommand::Set { key, value } => {
            match store.update(|config| config.set(key, value.to_owned())) {
                Ok(()) => {
                    println!("Updated config key `{key}`.");
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => {
                    eprintln!("Error: {error}");
                    ExitCode::from(EXIT_USAGE_OR_CONFIG)
                }
            }
        }
        crate::cli::ConfigCommand::Unset { key } => {
            match store.update(|config| config.unset(key)) {
                Ok(()) => {
                    println!("Unset config key `{key}`.");
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => {
                    eprintln!("Error: {error}");
                    ExitCode::from(EXIT_USAGE_OR_CONFIG)
                }
            }
        }
    }
}

fn projects(cli: &Cli, command: &ProjectsCommand) -> ExitCode {
    match command {
        ProjectsCommand::List => {
            let (client, token) = match authenticated_client(cli) {
                Ok(value) => value,
                Err((message, code)) => {
                    eprintln!("Error: {message}");
                    return ExitCode::from(code);
                }
            };

            match client.list_projects(&token) {
                Ok(response) => {
                    if wants_json(cli) {
                        println!("{}", serde_json::to_string(&response).expect("json"));
                    } else if response.projects.is_empty() {
                        println!("No CLI-visible projects for the active organization.");
                    } else {
                        println!(
                            "Projects for {}",
                            response
                                .active_organization_slug
                                .as_deref()
                                .or(response.active_organization_id.as_deref())
                                .unwrap_or("scoped organization")
                        );
                        for project in response.projects {
                            println!(
                                "{}\t{}\t{}\t{}",
                                project.id,
                                project.slug,
                                project.role.unwrap_or_else(|| "-".to_owned()),
                                project.name
                            );
                        }
                    }
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => fail_api(error),
            }
        }
        ProjectsCommand::Select { project } => {
            match update_config(|config| config.set("project", project.to_owned())) {
                Ok(()) => {
                    println!("Selected project `{project}`.");
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => {
                    eprintln!("Error: {error}");
                    ExitCode::from(EXIT_USAGE_OR_CONFIG)
                }
            }
        }
    }
}

fn envs(cli: &Cli, command: &EnvsCommand) -> ExitCode {
    match command {
        EnvsCommand::List => {
            let project_id = match resolve_project(cli) {
                Ok(value) => value,
                Err(error) => {
                    eprintln!("Error: {error}");
                    return ExitCode::from(EXIT_USAGE_OR_CONFIG);
                }
            };
            let (client, token) = match authenticated_client(cli) {
                Ok(value) => value,
                Err((message, code)) => {
                    eprintln!("Error: {message}");
                    return ExitCode::from(code);
                }
            };

            match client.list_environments(&token, &project_id) {
                Ok(response) => {
                    if wants_json(cli) {
                        println!("{}", serde_json::to_string(&response).expect("json"));
                    } else if response.environments.is_empty() {
                        println!("No environments are visible for project `{project_id}`.");
                    } else {
                        println!("Environments for {project_id}");
                        for environment in response.environments {
                            let marker = if environment.is_default { "*" } else { " " };
                            println!(
                                "{marker} {}\t{}\t{}",
                                environment.slug, environment.id, environment.name
                            );
                        }
                    }
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => fail_api(error),
            }
        }
        EnvsCommand::Select { environment } => {
            match update_config(|config| config.set("env", environment.to_owned())) {
                Ok(()) => {
                    println!("Selected environment `{environment}`.");
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => {
                    eprintln!("Error: {error}");
                    ExitCode::from(EXIT_USAGE_OR_CONFIG)
                }
            }
        }
    }
}

fn secrets(cli: &Cli, command: &SecretsCommand) -> ExitCode {
    match command {
        SecretsCommand::List => {
            let context = match authenticated_project_context(cli) {
                Ok(value) => value,
                Err((message, code)) => {
                    eprintln!("Error: {message}");
                    return ExitCode::from(code);
                }
            };

            match context.client.list_secrets(
                &context.token,
                &context.project_id,
                &context.environment,
                context.config.as_deref(),
            ) {
                Ok(response) => {
                    if wants_json(cli) {
                        println!("{}", serde_json::to_string(&response).expect("json"));
                    } else if response.secrets.is_empty() {
                        println!(
                            "No CLI-readable secrets in `{}` for `{}`.",
                            context.environment, context.project_id
                        );
                    } else {
                        println!(
                            "Secrets for {} ({})",
                            context.project_id, context.environment
                        );
                        for secret in response.secrets {
                            println!(
                                "{}\t{}\t{}\tv{}",
                                secret.name,
                                secret.mode,
                                secret.status,
                                secret.version.unwrap_or_default()
                            );
                        }
                    }
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => fail_api(error),
            }
        }
        SecretsCommand::Get {
            name,
            plain,
            silent,
        } => {
            let context = match authenticated_project_context(cli) {
                Ok(value) => value,
                Err((message, code)) => {
                    eprintln!("Error: {message}");
                    return ExitCode::from(code);
                }
            };

            match context.client.get_secret(
                &context.token,
                &context.project_id,
                &context.environment,
                context.config.as_deref(),
                name,
            ) {
                Ok(response) => {
                    if wants_json(cli) {
                        println!("{}", serde_json::to_string(&response).expect("json"));
                    } else if *plain || *silent {
                        if *silent {
                            print!("{}", response.value);
                        } else {
                            println!("{}", response.value);
                        }
                    } else {
                        println!("{}={}", response.secret.name, response.value);
                    }
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => fail_api(error),
            }
        }
        SecretsCommand::Pull => {
            let context = match authenticated_project_context(cli) {
                Ok(value) => value,
                Err((message, code)) => {
                    eprintln!("Error: {message}");
                    return ExitCode::from(code);
                }
            };

            match context.client.get_secret_values(
                &context.token,
                &context.project_id,
                &context.environment,
                context.config.as_deref(),
                "pull",
            ) {
                Ok(response) => {
                    print_secret_values(&response, secret_pull_format(cli));
                    ExitCode::from(EXIT_SUCCESS)
                }
                Err(error) => fail_api(error),
            }
        }
    }
}

fn run(cli: &Cli, command: &[String]) -> ExitCode {
    let context = match authenticated_project_context(cli) {
        Ok(value) => value,
        Err((message, code)) => {
            eprintln!("Error: {message}");
            return ExitCode::from(code);
        }
    };
    let response = match context.client.get_secret_values(
        &context.token,
        &context.project_id,
        &context.environment,
        context.config.as_deref(),
        "run",
    ) {
        Ok(response) => response,
        Err(error) => return fail_api(error),
    };
    let Some((program, args)) = command.split_first() else {
        eprintln!("Error: run requires a command.");
        return ExitCode::from(EXIT_USAGE_OR_CONFIG);
    };

    match ProcessCommand::new(program)
        .args(args)
        .envs(response.values)
        .status()
    {
        Ok(status) => ExitCode::from(status.code().unwrap_or(EXIT_GENERIC_FAILURE.into()) as u8),
        Err(error) => {
            eprintln!("Error: unable to start command `{program}`: {error}");
            ExitCode::from(EXIT_GENERIC_FAILURE)
        }
    }
}

fn resolve_api_url(cli: &Cli) -> Result<Option<String>, String> {
    if cli.api_url.is_some() {
        return Ok(cli.api_url.clone());
    }

    ConfigStore::load_resolved().map(|config| config.api_url)
}

struct ProjectContext {
    client: ApiClient,
    token: String,
    project_id: String,
    environment: String,
    config: Option<String>,
}

fn authenticated_project_context(cli: &Cli) -> Result<ProjectContext, (String, u8)> {
    let (client, token) = authenticated_client(cli)?;
    let project_id = resolve_project(cli).map_err(|error| (error, EXIT_USAGE_OR_CONFIG))?;
    let environment = resolve_environment(cli).map_err(|error| (error, EXIT_USAGE_OR_CONFIG))?;
    let config = resolve_config(cli).map_err(|error| (error, EXIT_USAGE_OR_CONFIG))?;

    Ok(ProjectContext {
        client,
        token,
        project_id,
        environment,
        config,
    })
}

fn authenticated_client(cli: &Cli) -> Result<(ApiClient, String), (String, u8)> {
    let api_url = resolve_api_url(cli).map_err(|error| (error, EXIT_USAGE_OR_CONFIG))?;
    let client = ApiClient::new(api_url.as_deref(), cli.allow_insecure_http)
        .map_err(|error| (error, EXIT_USAGE_OR_CONFIG))?;
    let token = auth::token()
        .map_err(|error| (error, EXIT_GENERIC_FAILURE))?
        .ok_or_else(|| {
            (
                "not authenticated. Run `pv login` or set PENTAVAULT_TOKEN.".to_owned(),
                EXIT_AUTH_REQUIRED,
            )
        })?;

    Ok((client, token))
}

fn resolve_project(cli: &Cli) -> Result<String, String> {
    if let Some(project) = cli
        .project
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        return Ok(project.trim().to_owned());
    }

    ConfigStore::load_resolved()
        .and_then(|config| {
            config
                .project
                .filter(|value| !value.trim().is_empty())
                .ok_or_else(|| "project is not selected. Use `pv projects select <project-id>` or pass `--project`.".to_owned())
        })
}

fn resolve_environment(cli: &Cli) -> Result<String, String> {
    if let Some(environment) = cli
        .environment
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        return Ok(environment.trim().to_owned());
    }

    let configured_environment = ConfigStore::load_resolved()
        .map(|config| config.environment)
        .unwrap_or(None);

    Ok(configured_environment.unwrap_or_else(|| "development".to_owned()))
}

fn resolve_config(cli: &Cli) -> Result<Option<String>, String> {
    if let Some(config) = cli
        .config
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        return Ok(Some(config.trim().to_owned()));
    }

    ConfigStore::load_resolved()
        .map(|config| config.config.filter(|value| !value.trim().is_empty()))
}

fn update_config(
    edit: impl FnOnce(&mut crate::config::AppConfig) -> Result<(), String>,
) -> Result<(), String> {
    ConfigStore::effective()?.update(edit)
}

fn wants_json(cli: &Cli) -> bool {
    cli.json || matches!(cli.format, OutputFormat::Json)
}

fn print_secret_values(response: &CliSecretValuesResponse, format: SecretPullFormat) {
    match format {
        SecretPullFormat::Json => {
            println!("{}", serde_json::to_string(response).expect("json"));
        }
        SecretPullFormat::Dotenv => {
            for (name, value) in &response.values {
                println!("{name}={}", dotenv_value(value));
            }
        }
        SecretPullFormat::Env => {
            for (name, value) in &response.values {
                println!("export {name}={}", shell_single_quoted(value));
            }
        }
    }
}

fn secret_pull_format(cli: &Cli) -> SecretPullFormat {
    if cli.json {
        return SecretPullFormat::Json;
    }

    match cli.format {
        OutputFormat::Json => SecretPullFormat::Json,
        OutputFormat::Env => SecretPullFormat::Env,
        OutputFormat::Dotenv | OutputFormat::Human => SecretPullFormat::Dotenv,
    }
}

fn dotenv_value(value: &str) -> String {
    if value
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || "_-./:".contains(character))
    {
        return value.to_owned();
    }

    format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\""))
}

fn shell_single_quoted(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\"'\"'"))
}

fn slugify(value: &str) -> String {
    let mut slug = String::with_capacity(value.len());
    let mut previous_was_separator = true;
    for character in value.trim().to_lowercase().chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character);
            previous_was_separator = false;
        } else if !previous_was_separator {
            slug.push('-');
            previous_was_separator = true;
        }
    }
    if previous_was_separator {
        slug.pop();
    }
    slug
}

fn fail_api(error: String) -> ExitCode {
    eprintln!("Error: {error}");
    ExitCode::from(EXIT_GENERIC_FAILURE)
}

fn completion(shell: crate::cli::Shell) -> ExitCode {
    let mut command = Cli::command();
    let bin_name = command.get_name().to_owned();
    let generator: clap_complete::Shell = shell.into();
    generate(generator, &mut command, bin_name, &mut io::stdout());
    ExitCode::from(EXIT_SUCCESS)
}

fn format_device_code(code: &str) -> String {
    let normalized = code
        .chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .map(|character| character.to_ascii_uppercase())
        .collect::<String>();

    if normalized.len() <= 3 {
        return normalized;
    }

    format!("{}-{}", &normalized[..3], &normalized[3..])
}

#[cfg(test)]
mod tests {
    use super::{dotenv_value, format_device_code, shell_single_quoted, slugify};

    #[test]
    fn formats_device_code_with_three_character_grouping() {
        assert_eq!(format_device_code("xevmf3"), "XEV-MF3");
        assert_eq!(format_device_code("XEV-MF3"), "XEV-MF3");
    }

    #[test]
    fn formats_secret_values_for_dotenv_and_shell_output() {
        assert_eq!(dotenv_value("plain_value-1"), "plain_value-1");
        assert_eq!(dotenv_value("needs spaces"), "\"needs spaces\"");
        assert_eq!(shell_single_quoted("can't"), "'can'\"'\"'t'");
    }

    #[test]
    fn slugify_collapses_all_separator_runs() {
        assert_eq!(
            slugify("  Production --- West / API  "),
            "production-west-api"
        );
        assert_eq!(slugify("---"), "");
    }
}
