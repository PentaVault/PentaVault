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

    #[arg(long, global = true, value_name = "CONFIG")]
    pub config: Option<String>,

    #[arg(long, global = true, value_enum, default_value_t = OutputFormat::Human)]
    pub format: OutputFormat,

    #[arg(long, global = true, action = ArgAction::SetTrue)]
    pub json: bool,

    #[arg(long = "no-color", global = true, action = ArgAction::SetTrue, env = "PENTAVAULT_NO_COLOR")]
    pub no_color: bool,

    #[arg(short, long, global = true, action = ArgAction::Count)]
    pub verbose: u8,

    #[arg(
        long,
        global = true,
        action = ArgAction::SetTrue,
        env = "PENTAVAULT_ALLOW_INSECURE_HTTP",
        help = "Allow plain HTTP for a non-loopback API endpoint. Unsafe outside trusted development networks."
    )]
    pub allow_insecure_http: bool,

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
    #[command(about = "Configure this project with a guided terminal flow.")]
    Init {
        #[arg(long, help = "Choose defaults without interactive prompts.")]
        yes: bool,
        #[arg(long, help = "Add convenient PentaVault scripts to package.json.")]
        package_json: bool,
    },
    #[command(subcommand, about = "Manage organization selection.")]
    Organizations(OrganizationsCommand),
    #[command(subcommand, about = "Manage account API keys.")]
    ApiKeys(ApiKeysCommand),
    #[command(subcommand, about = "Manage project selection.")]
    Projects(ProjectsCommand),
    #[command(subcommand, about = "Manage environment selection.")]
    Envs(EnvsCommand),
    #[command(subcommand, about = "Manage config branch selection.")]
    Configs(ConfigsCommand),
    #[command(subcommand, about = "Read and manage secrets.")]
    Secrets(SecretsCommand),
    #[command(about = "Run a command with PentaVault secrets injected.")]
    Run {
        #[arg(last = true, required = true)]
        command: Vec<String>,
    },
    #[command(subcommand, about = "Read or update non-secret CLI configuration.")]
    Config(ConfigCommand),
    #[command(subcommand, about = "Work with change requests.")]
    ChangeRequests(ChangeRequestsCommand),
    #[command(subcommand, about = "Request and track project access.")]
    Access(AccessCommand),
    #[command(
        subcommand,
        about = "Authenticate a workload with a federated assertion."
    )]
    Identity(IdentityCommand),
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
pub enum OrganizationsCommand {
    List,
    Select { organization: String },
}

#[derive(Clone, Debug, ValueEnum)]
pub enum ApiKeyType {
    CommandLine,
    ServiceAccount,
    Personal,
    Scim,
    Audit,
}

impl ApiKeyType {
    pub fn as_api_value(&self) -> &'static str {
        match self {
            Self::CommandLine => "command-line",
            Self::ServiceAccount => "service-account",
            Self::Personal => "personal",
            Self::Scim => "scim",
            Self::Audit => "audit",
        }
    }
}

#[derive(Clone, Debug, ValueEnum)]
pub enum ApiKeyPermission {
    Read,
    Write,
    Create,
    Delete,
}

impl ApiKeyPermission {
    pub fn as_api_value(&self) -> &'static str {
        match self {
            Self::Read => "read",
            Self::Write => "write",
            Self::Create => "create",
            Self::Delete => "delete",
        }
    }
}

#[derive(Debug, Subcommand)]
pub enum ApiKeysCommand {
    List,
    Create {
        #[arg(long)]
        name: Option<String>,
        #[arg(long, value_enum, default_value_t = ApiKeyType::Personal)]
        r#type: ApiKeyType,
        #[arg(
            long,
            help = "Scope the key to an organization id. Defaults to the active organization."
        )]
        organization: Option<String>,
        #[arg(
            long = "permission",
            value_enum,
            help = "Grant a proxy action. Repeat for more actions. Defaults to read only."
        )]
        permissions: Vec<ApiKeyPermission>,
    },
    Revoke {
        id: String,
    },
}

#[derive(Debug, Subcommand)]
pub enum EnvsCommand {
    List,
    Select { environment: String },
}

#[derive(Debug, Subcommand)]
pub enum ConfigsCommand {
    List,
    Select {
        config: String,
    },
    Create {
        name: String,
        #[arg(long)]
        slug: Option<String>,
        #[arg(long)]
        parent: Option<String>,
    },
    Diff {
        #[arg(long)]
        target: Option<String>,
    },
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

#[derive(Debug, Subcommand)]
pub enum ChangeRequestsCommand {
    List,
    Create {
        #[arg(long)]
        config: String,
        #[arg(long)]
        target: String,
        #[arg(long)]
        title: Option<String>,
        #[arg(long)]
        description: Option<String>,
        #[arg(long = "secret", value_name = "NAME")]
        secrets: Vec<String>,
        #[arg(long, help = "Include every secret in the source config.")]
        all: bool,
    },
    Approve {
        id: String,
    },
    Merge {
        id: String,
    },
    Cancel {
        id: String,
    },
}

#[derive(Clone, Debug, ValueEnum)]
pub enum AccessRequestStatus {
    Pending,
    Approved,
    Denied,
    Rejected,
    Cancelled,
}

impl AccessRequestStatus {
    pub fn as_api_value(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Denied => "denied",
            Self::Rejected => "rejected",
            Self::Cancelled => "cancelled",
        }
    }
}

#[derive(Debug, Subcommand)]
pub enum AccessCommand {
    Request {
        #[arg(long)]
        message: Option<String>,
    },
    Status {
        #[arg(long, value_enum)]
        status: Option<AccessRequestStatus>,
        #[arg(long, help = "List requests across all projects.")]
        all_projects: bool,
    },
    Cancel {
        id: String,
    },
}

#[derive(Debug, Subcommand)]
pub enum IdentityCommand {
    #[command(
        about = "Exchange an OIDC assertion for a short-lived pv_mid_ access token.",
        long_about = "Exchange an OIDC assertion for a short-lived pv_mid_ access token.

            The assertion is the credential, so no stored login is used or required. The token             is printed rather than saved: it expires in minutes and belongs to the process that             requested it, not to the machine."
    )]
    Login {
        #[arg(long, help = "Organization that owns the identity.")]
        organization: String,
        #[arg(long, help = "Identity name to authenticate as.")]
        name: String,
        #[arg(
            long,
            help = "Read the assertion from this file. Use `-` for stdin.",
            conflicts_with = "assertion_env"
        )]
        assertion_file: Option<String>,
        #[arg(
            long,
            help = "Read the assertion from this environment variable (e.g. ACTIONS_ID_TOKEN).",
            conflicts_with = "assertion_file"
        )]
        assertion_env: Option<String>,
        #[arg(
            long,
            help = "Print only the token, for `export PENTAVAULT_TOKEN=$(pv identity login ... --token-only)`."
        )]
        token_only: bool,
    },
    #[command(about = "Show what a pv_mid_ token resolves to.")]
    Whoami {
        #[arg(
            long,
            help = "Identity token to inspect. Defaults to PENTAVAULT_TOKEN."
        )]
        token: Option<String>,
    },
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
