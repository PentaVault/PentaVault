# PentaVault CLI

`pv` is the native Rust CLI for PentaVault. It uses browser-approved device login, keeps persistent credentials in the OS credential store, and leaves authorization decisions to the backend.

## Start

```powershell
pv --api-url http://localhost:3001 login
cd path\to\project
pv init
pv secrets list
pv run -- pnpm dev
```

`pv init` is a guided terminal flow. It shows the signed-in user, organization count, organization choices, projects, environments, and config branches. It writes `.pentavault.toml` in the current project. That file contains routing metadata only:

```toml
api_url = "https://api.example.com"
organization = "org_123"
project = "project_123"
environment = "development"
config = "my-branch"
```

Never put a token, API key, session, or secret value in this file. Command flags override project config; project config overrides global CLI config.

Use `pv init --yes` for deterministic defaults. Add `--package-json` to create non-destructive `secrets:pull` and `secrets:run` scripts when `package.json` exists.

## Command Map

```text
pv login [--token-stdin]
pv logout [--purge-cache]
pv whoami
pv init [--yes] [--package-json]

pv organizations list
pv organizations select <organization-id>
pv projects list
pv projects select <project-id>
pv envs list
pv envs select <environment>

pv configs list
pv configs select <config>
pv configs create <name> [--slug <slug>] [--parent <config>]
pv configs diff [--target <config>]

pv change-requests list
pv change-requests create --config <source> --target <target> [--all|--secret <name>]
pv change-requests approve|merge|cancel <id>

pv access request [--message <text>]
pv access status [--status <status>] [--all-projects]
pv access cancel <id>

pv api-keys list
pv api-keys create [--name <name>] [--type <type>] [--organization <id>] [--permission <action>]...
pv api-keys revoke <id>

pv secrets list
pv secrets get <name> [--plain] [--silent]
pv secrets pull
pv run -- <command> [args...]

pv config get|set|unset <key> [value]
pv doctor
pv version
pv completion power-shell|bash|zsh|fish
```

New keys are read-only unless `--permission` is repeated with one or more of
`read`, `write`, `create`, or `delete`. API-key credentials cannot create or
revoke other API keys; use a browser-approved user session for key management.

Global routing/output flags include `--api-url`, `--project`, `--env`, `--config`, `--json`, `--format`, `--no-color`, and `--verbose`. Plain HTTP is accepted only for loopback by default; `--allow-insecure-http` is an explicit development-only escape hatch.

## API Keys And Collaboration

- Personal keys belong to one person and one organization scope.
- Service-account keys belong to one workload, not a human team.
- Collaborators join organizations and receive project roles; they do not share keys.
- New keys are shown once. Put them in an OS credential store or CI/deployment secret vault immediately.
- A request authenticated by an API key cannot create, list, or revoke more keys. Run `pv login` for a browser-approved user session before key management.
- Revoke unused keys and inspect request counts/last-use metadata regularly.

For disposable CI, set `PENTAVAULT_TOKEN` only for the process. `pv logout` cannot remove an environment variable; unset it in the parent shell.

## Security And Failure Behavior

- Remote non-loopback APIs require HTTPS unless explicitly overridden.
- Redirects are not followed for authenticated requests.
- Dynamic URL path segments are encoded.
- API error bodies are sanitized and bounded before terminal output.
- `secrets list` returns metadata. Values are fetched only by `get`, `pull`, or `run` after backend policy checks and audit logging.
- Logout attempts remote session revocation before deleting the local credential.
- No offline secret cache exists yet. It will not be added until backend leases and revision checks prevent stale cache from bypassing revocation.

## Development

```text
pnpm run cli:build
pnpm run cli:lint
pnpm run cli:test
cargo build --release --manifest-path packages/cli/Cargo.toml
```

Windows artifact packaging lives in `.github/workflows/cli-windows-artifact.yml`. See `docs/cli-packaging.md` for completion and release steps.
