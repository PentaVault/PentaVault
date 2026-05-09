# PentaVault CLI

`pv` is the Rust command line interface for PentaVault. The first usable
milestone is online and read-only: it authenticates with the web app, lists
authorized projects/environments/secrets, pulls secret values, and injects them
into a child process through `pv run`.

## Commands

```text
pv login
pv logout
pv whoami
pv projects list
pv projects select <project-id>
pv envs list
pv envs select <environment>
pv secrets list
pv secrets get <name> [--plain] [--silent]
pv secrets pull
pv run -- <command> [args...]
pv doctor
pv version
pv completion power-shell|bash|zsh|fish
```

Global flags:

```text
--api-url <url>
--project <project-id>
--env <environment>
--json
--format human|json|dotenv|env
--no-color
--verbose
```

## Local Login Flow

With the backend on `http://localhost:3001` and frontend on
`http://localhost:3000`:

```powershell
packages\cli\target\debug\pv.exe --api-url http://localhost:3001 login
```

The CLI prints:

- `Open: http://localhost:3000/device`
- `Code: ABC-123`

Open the URL, sign in or register if needed, confirm the current account, enter
the six-character code, and approve. The CLI stores the returned credential in
the OS credential store.

For CI or disposable local sessions, use a process-scoped token instead:

```powershell
$env:PENTAVAULT_TOKEN = "dev-token"
packages\cli\target\debug\pv.exe whoami
Remove-Item Env:PENTAVAULT_TOKEN
```

## Read-Only Secret Workflows

```powershell
packages\cli\target\debug\pv.exe projects list
packages\cli\target\debug\pv.exe projects select project_123
packages\cli\target\debug\pv.exe envs list
packages\cli\target\debug\pv.exe envs select development
packages\cli\target\debug\pv.exe secrets list
packages\cli\target\debug\pv.exe secrets get STRIPE_SECRET --plain
packages\cli\target\debug\pv.exe --format dotenv secrets pull
packages\cli\target\debug\pv.exe run -- pnpm test
```

`projects select` and `envs select` store only non-secret routing metadata in the
platform config file. Secret values and tokens are never written to the config
file.

## Security Model

- All online commands call backend `/api/v1/cli/*` endpoints with the current
  credential.
- Backend session, organization, project, and secret-access policy remains the
  source of truth.
- `secrets list` returns metadata only.
- `secrets get`, `secrets pull`, and `run` request values only after backend
  policy checks and audit logging.
- The CLI does not implement write, access-review, or cache mutation commands in
  this milestone.
- Command tests assert that credentials are not printed in normal output.

## Development

From the repository root:

```text
pnpm run cli:build
pnpm run cli:lint
pnpm run cli:test
```

The root scripts call Cargo with `--manifest-path packages/cli/Cargo.toml` so
the frontend package manager remains the main entry point while Rust stays
isolated inside the CLI package.
