# CLI Packaging

Status: Active
Updated: 2026-07-10

This document describes the current packaging baseline for the Rust `pv` CLI.

## Native Release Artifacts

The GitHub Actions workflow at
`.github/workflows/cli-release-artifacts.yml` builds native artifacts on:

- manual `workflow_dispatch`
- tags matching `cli-v*`

The matrix covers Windows, Linux, and macOS using each hosted runner's native
architecture. The workflow:

- installs the pinned Rust 1.82 toolchain
- checks Rust formatting
- runs locked Cargo tests and Clippy on every platform
- builds the native `pv` executable with `cargo build --release --locked`
- generates PowerShell, bash, zsh, and fish completions
- packages the native binary, completions, `README.md`, and `LICENSE`
- uploads a zip on Windows or a permission-preserving tarball on Unix, plus a
  SHA-256 checksum

The artifact name is:

```text
pv-<version>-<platform>-<architecture>.<zip|tar.gz>
```

## Local Release Smoke Test

Before cutting a CLI tag, run:

```powershell
pnpm run cli:build
pnpm run cli:lint
pnpm run cli:test
packages\cli\target\debug\pv.exe doctor
packages\cli\target\debug\pv.exe completion power-shell
```

For a local release-mode binary:

```powershell
cargo build --release --locked --manifest-path packages/cli/Cargo.toml
packages\cli\target\release\pv.exe version
```

## PowerShell Completion

Generate completion locally:

```powershell
packages\cli\target\release\pv.exe completion power-shell > pv.ps1
```

Install for the current user:

```powershell
$completionDir = Join-Path $HOME "Documents\PowerShell\Completions"
New-Item -ItemType Directory -Force $completionDir | Out-Null
Copy-Item .\pv.ps1 (Join-Path $completionDir "pv.ps1")
Add-Content -Path $PROFILE -Value '. "$HOME\Documents\PowerShell\Completions\pv.ps1"'
```

Restart PowerShell and run:

```powershell
pv <Tab>
```

## Winget Handoff

The current artifact is winget-ready in shape but not yet submitted. A winget
submission needs:

- a stable public release URL for the zip
- SHA-256 checksum from the workflow artifact
- product metadata owned by the release maintainer
- signing decision recorded before beta

Do not publish unsigned production binaries as a stable installer channel until
the signing process is approved.

## Still Pending

- signed binary release process
- installer metadata submission
- publishing workflow artifacts as signed GitHub release assets
