use std::io;
use std::process::Command as ProcessCommand;
use std::process::ExitCode;

use clap::CommandFactory;
use clap_complete::generate;

use crate::api::{ApiClient, CliSecretValuesResponse};
use crate::auth::{self, Credential};
use crate::cli::{
    ChangeRequestsCommand, Cli, Command, ConfigsCommand, EnvsCommand, OutputFormat,
    ProjectsCommand, SecretPullFormat, SecretsCommand,
};
use crate::config::ConfigStore;

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
        Command::Logout { purge_cache } => logout(*purge_cache),
        Command::Whoami => whoami(&cli),
        Command::Config(command) => config(command),
        Command::Projects(command) => projects(&cli, command),
        Command::Envs(command) => envs(&cli, command),
        Command::Configs(command) => configs(&cli, command),
        Command::Secrets(command) => secrets(&cli, command),
        Command::Run { command } => run(&cli, command),
        Command::ChangeRequests(command) => change_requests(command),
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
            println!(
                "Config branch create is queued for API support: name=`{name}`, slug=`{resolved_slug}`, parent=`{}`.",
                parent.as_deref().unwrap_or("selected root")
            );
            ExitCode::from(EXIT_SUCCESS)
        }
        ConfigsCommand::Diff { target } => {
            println!(
                "Config diff will compare the selected config against `{}`.",
                target.as_deref().unwrap_or("root")
            );
            ExitCode::from(EXIT_SUCCESS)
        }
    }
}

fn change_requests(command: &ChangeRequestsCommand) -> ExitCode {
    match command {
        ChangeRequestsCommand::List => {
            println!("Change request listing is available in the web console.");
        }
        ChangeRequestsCommand::Create { config, target } => {
            println!("Change request create queued: {config} -> {target}.");
        }
        ChangeRequestsCommand::Approve { id } => println!("Approve change request `{id}` queued."),
        ChangeRequestsCommand::Merge { id } => println!("Merge change request `{id}` queued."),
        ChangeRequestsCommand::Cancel { id } => println!("Cancel change request `{id}` queued."),
    }

    ExitCode::from(EXIT_SUCCESS)
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
    let config_path = ConfigStore::platform()
        .map(|store| store.path().display().to_string())
        .unwrap_or_else(|error| format!("unavailable: {error}"));
    let auth_status = auth::effective_credential()
        .map(|credential| match credential {
            Some(Credential::EnvironmentToken) => "environment",
            Some(Credential::StoredToken) => "credential-store",
            None => "not-authenticated",
        })
        .unwrap_or("credential-store-unavailable");

    if cli.json {
        println!(
            "{}",
            serde_json::json!({
                "status": "ok",
                "configPath": config_path,
                "auth": auth_status,
                "checks": [
                    {
                        "name": "cli",
                        "status": "ok",
                        "message": "CLI skeleton is installed."
                    },
                    {
                        "name": "auth",
                        "status": "needs_setup",
                        "message": "Use `pv login --token-stdin` for local development until interactive auth lands."
                    }
                ]
            })
        );
    } else {
        println!("PentaVault CLI doctor");
        println!("Status: ok");
        println!("CLI: installed");
        println!("Config: {config_path}");
        println!("Auth: {auth_status}");
    }

    ExitCode::from(EXIT_SUCCESS)
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
    let client = match ApiClient::new(api_url.as_deref()) {
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

fn logout(purge_cache: bool) -> ExitCode {
    if let Err(error) = auth::delete_stored_token() {
        eprintln!("Error: {error}");
        return ExitCode::from(EXIT_GENERIC_FAILURE);
    }

    println!("Removed stored PentaVault credential.");
    if purge_cache {
        println!("Encrypted cache purge will be available with M4 cache support.");
    }

    ExitCode::from(EXIT_SUCCESS)
}

fn whoami(cli: &Cli) -> ExitCode {
    match auth::effective_credential() {
        Ok(Some(Credential::EnvironmentToken)) => {
            if cli.json {
                println!(
                    "{}",
                    serde_json::json!({ "authenticated": true, "source": "environment" })
                );
            } else {
                println!("Authenticated with PENTAVAULT_TOKEN.");
            }
            ExitCode::from(EXIT_SUCCESS)
        }
        Ok(Some(Credential::StoredToken)) => {
            if cli.json {
                println!(
                    "{}",
                    serde_json::json!({ "authenticated": true, "source": "credential-store" })
                );
            } else {
                println!("Authenticated with the OS credential store.");
            }
            ExitCode::from(EXIT_SUCCESS)
        }
        Ok(None) => {
            if cli.json {
                println!("{}", serde_json::json!({ "authenticated": false }));
            } else {
                eprintln!("Error: not authenticated.");
                eprintln!();
                eprintln!(
                    "Next: run `pv login --token-stdin` or set PENTAVAULT_TOKEN for this process."
                );
            }
            ExitCode::from(EXIT_AUTH_REQUIRED)
        }
        Err(error) => {
            eprintln!("Error: {error}");
            ExitCode::from(EXIT_GENERIC_FAILURE)
        }
    }
}

fn config(command: &crate::cli::ConfigCommand) -> ExitCode {
    let store = match ConfigStore::platform() {
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

    ConfigStore::platform()
        .and_then(|store| store.load())
        .map(|config| config.api_url)
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
    let client =
        ApiClient::new(api_url.as_deref()).map_err(|error| (error, EXIT_USAGE_OR_CONFIG))?;
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

    ConfigStore::platform()
        .and_then(|store| store.load())
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

    let configured_environment = ConfigStore::platform()
        .and_then(|store| store.load())
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

    ConfigStore::platform()
        .and_then(|store| store.load())
        .map(|config| config.config.filter(|value| !value.trim().is_empty()))
}

fn update_config(
    edit: impl FnOnce(&mut crate::config::AppConfig) -> Result<(), String>,
) -> Result<(), String> {
    ConfigStore::platform()?.update(edit)
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
    let slug = value
        .trim()
        .to_lowercase()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character
            } else {
                '-'
            }
        })
        .collect::<String>();

    slug.trim_matches('-').replace("--", "-")
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
    use super::{dotenv_value, format_device_code, shell_single_quoted};

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
}
