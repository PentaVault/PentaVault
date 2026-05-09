use std::io;
use std::process::ExitCode;

use clap::CommandFactory;
use clap_complete::generate;

use crate::api::ApiClient;
use crate::auth::{self, Credential};
use crate::cli::{Cli, Command};
use crate::config::ConfigStore;

const EXIT_SUCCESS: u8 = 0;
const EXIT_GENERIC_FAILURE: u8 = 1;
const EXIT_USAGE_OR_CONFIG: u8 = 2;
const EXIT_AUTH_REQUIRED: u8 = 3;

pub fn dispatch(cli: Cli) -> ExitCode {
    match cli.command {
        Command::Version => version(&cli),
        Command::Doctor => doctor(&cli),
        Command::Completion { shell } => completion(shell),
        Command::Login { token_stdin } => login(&cli, token_stdin),
        Command::Logout { purge_cache } => logout(purge_cache),
        Command::Whoami => whoami(&cli),
        Command::Config(command) => config(command),
        Command::Projects(_) | Command::Envs(_) | Command::Secrets(_) | Command::Run { .. } => {
            not_implemented()
        }
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

fn config(command: crate::cli::ConfigCommand) -> ExitCode {
    let store = match ConfigStore::platform() {
        Ok(store) => store,
        Err(error) => {
            eprintln!("Error: {error}");
            return ExitCode::from(EXIT_GENERIC_FAILURE);
        }
    };

    match command {
        crate::cli::ConfigCommand::Get { key } => {
            match store.load().and_then(|config| config.value(&key)) {
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
            match store.update(|config| config.set(&key, value)) {
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
        crate::cli::ConfigCommand::Unset { key } => match store.update(|config| config.unset(&key))
        {
            Ok(()) => {
                println!("Unset config key `{key}`.");
                ExitCode::from(EXIT_SUCCESS)
            }
            Err(error) => {
                eprintln!("Error: {error}");
                ExitCode::from(EXIT_USAGE_OR_CONFIG)
            }
        },
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

fn completion(shell: crate::cli::Shell) -> ExitCode {
    let mut command = Cli::command();
    let bin_name = command.get_name().to_owned();
    let generator: clap_complete::Shell = shell.into();
    generate(generator, &mut command, bin_name, &mut io::stdout());
    ExitCode::from(EXIT_SUCCESS)
}

fn not_implemented() -> ExitCode {
    eprintln!("Error: this command is not implemented in the current CLI milestone yet.");
    eprintln!();
    eprintln!("Next: see docs/planning/cli-development-plan.md and tasks.md for rollout status.");
    ExitCode::from(EXIT_USAGE_OR_CONFIG)
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
    use super::format_device_code;

    #[test]
    fn formats_device_code_with_three_character_grouping() {
        assert_eq!(format_device_code("xevmf3"), "XEV-MF3");
        assert_eq!(format_device_code("XEV-MF3"), "XEV-MF3");
    }
}
