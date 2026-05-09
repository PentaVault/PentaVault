use clap::{ArgAction, Parser, Subcommand, ValueEnum};

#[derive(Debug, Parser)]
#[command(
    name = "pv",
    bin_name = "pv",
    version,
    about = "Security-first command line interface for PentaVault.",
    long_about = "Fetch, inject, and manage PentaVault project secrets from the terminal.",
    next_line_help = true
)]
pub struct Cli {
    #[arg(long, global = true, env = "PENTAVAULT_API_URL", value_name = "URL")]
    pub api_url: Option<String>,

    #[arg(long, global = true, value_name = "PROJECT")]
    pub project: Option<String>,

    #[arg(long = "env", global = true, value_name = "ENVIRONMENT")]
    pub environment: Option<String>,

    #[arg(long, global = true, value_enum, default_value_t = OutputFormat::Human)]
    pub format: OutputFormat,

    #[arg(long, global = true, action = ArgAction::SetTrue)]
    pub json: bool,

    #[arg(long = "no-color", global = true, action = ArgAction::SetTrue, env = "PENTAVAULT_NO_COLOR")]
    pub no_color: bool,

    #[arg(short, long, global = true, action = ArgAction::Count)]
    pub verbose: u8,

    #[command(subcommand)]
    pub command: Command,
}

#[derive(Clone, Debug, ValueEnum)]
pub enum OutputFormat {
    Human,
    Json,
    Dotenv,
    Env,
}

#[derive(Debug, Subcommand)]
pub enum Command {
    #[command(about = "Start an interactive login flow.")]
    Login {
        #[arg(
            long,
            help = "Read a token from stdin and store it in the OS credential store."
        )]
        token_stdin: bool,
    },
    #[command(about = "Remove stored PentaVault credentials.")]
    Logout {
        #[arg(long, help = "Delete encrypted secret cache material as well.")]
        purge_cache: bool,
    },
    #[command(about = "Show the current authenticated identity.")]
    Whoami,
    #[command(subcommand, about = "Manage project selection.")]
    Projects(ProjectsCommand),
    #[command(subcommand, about = "Manage environment selection.")]
    Envs(EnvsCommand),
    #[command(subcommand, about = "Read and manage secrets.")]
    Secrets(SecretsCommand),
    #[command(about = "Run a command with PentaVault secrets injected.")]
    Run {
        #[arg(last = true, required = true)]
        command: Vec<String>,
    },
    #[command(subcommand, about = "Read or update non-secret CLI configuration.")]
    Config(ConfigCommand),
    #[command(about = "Run local diagnostics for the CLI environment.")]
    Doctor,
    #[command(about = "Generate shell completion scripts.")]
    Completion {
        #[arg(value_enum)]
        shell: Shell,
    },
    #[command(about = "Print the CLI version.")]
    Version,
}

#[derive(Debug, Subcommand)]
pub enum ProjectsCommand {
    List,
    Select { project: String },
}

#[derive(Debug, Subcommand)]
pub enum EnvsCommand {
    List,
    Select { environment: String },
}

#[derive(Debug, Subcommand)]
pub enum SecretsCommand {
    List,
    Get {
        name: String,
        #[arg(long)]
        plain: bool,
        #[arg(long)]
        silent: bool,
    },
    Pull,
}

#[derive(Clone, Debug, ValueEnum)]
pub enum SecretPullFormat {
    Dotenv,
    Json,
    Env,
}

#[derive(Debug, Subcommand)]
pub enum ConfigCommand {
    Get { key: String },
    Set { key: String, value: String },
    Unset { key: String },
}

#[derive(Clone, Debug, ValueEnum)]
pub enum Shell {
    PowerShell,
    Bash,
    Zsh,
    Fish,
}

impl From<Shell> for clap_complete::Shell {
    fn from(shell: Shell) -> Self {
        match shell {
            Shell::PowerShell => clap_complete::Shell::PowerShell,
            Shell::Bash => clap_complete::Shell::Bash,
            Shell::Zsh => clap_complete::Shell::Zsh,
            Shell::Fish => clap_complete::Shell::Fish,
        }
    }
}
