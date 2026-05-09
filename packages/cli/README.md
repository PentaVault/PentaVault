# PentaVault CLI

`pv` is the planned Windows-first command line interface for PentaVault.

This package currently implements the M1 CLI skeleton from
`docs/planning/cli-development-plan.md`:

- standard `clap` command parsing
- global CLI flags
- `pv version`
- `pv doctor`
- shell completion generation for PowerShell, bash, zsh, and fish
- command tests for the stable skeleton behavior

Secret, auth, cache, and access commands are registered so help output reflects
the intended product shape, but they intentionally return a not-implemented
usage error until the backend API contracts are finalized.

## Commands

```text
pv version
pv doctor
pv completion powershell
pv completion bash
pv completion zsh
pv completion fish
```

## Development

From the repository root:

```text
pnpm run cli:build
pnpm run cli:lint
pnpm run cli:test
```

The root scripts call Cargo with `--manifest-path packages/cli/Cargo.toml` so the
frontend package manager remains the repo entry point while Rust stays isolated
inside the CLI package.

## Local Testing

Build the CLI:

```text
pnpm run cli:build
```

Run the debug binary on Windows:

```text
packages\cli\target\debug\pv.exe --help
packages\cli\target\debug\pv.exe version
packages\cli\target\debug\pv.exe doctor
packages\cli\target\debug\pv.exe completion powershell
```

Test process-scoped CI/service-token mode without storing credentials:

```powershell
$env:PENTAVAULT_TOKEN = "dev-token"
packages\cli\target\debug\pv.exe whoami
Remove-Item Env:PENTAVAULT_TOKEN
```

Test local credential-store mode with a disposable development token:

```powershell
"dev-token" | packages\cli\target\debug\pv.exe login --token-stdin
packages\cli\target\debug\pv.exe whoami
packages\cli\target\debug\pv.exe logout
```

Do not use a production token while the CLI is still in pre-auth-contract
development.

## Security Notes

- Config flags may include routing metadata such as API URL, project, and
  environment.
- Tokens, plaintext secret values, and cache encryption keys must not be stored
  in config files.
- CI tokens from `PENTAVAULT_TOKEN` must remain process-scoped until M2 adds the
  credential-store abstraction.
