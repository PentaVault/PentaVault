# PentaVault CLI Implementation Tasks

Status values:

- `pending`: not started yet.
- `completed`: implemented and locally checked where tooling is available.
- `needs review`: requires product/API/security review or unavailable local tooling.

## M0: Architecture Lock

- [x] `completed` Choose Rust as the CLI implementation language, matching the approved plan.
- [x] `completed` Place the CLI package at `packages/cli`.
- [x] `completed` Confirm the v1 interactive auth flow uses Better Auth OAuth device authorization through the frontend verification page.
- [ ] `needs review` Confirm cache lease semantics and offline/stale-if-error policy limits.
- [ ] `needs review` Review the implemented backend `/v1/cli/*` read-only API contract before frontend/CLI consumption is finalized.

## M1: CLI Skeleton

- [x] `completed` Scaffold `packages/cli` as a Rust package using standard crates.
- [x] `completed` Implement `pv --help`, `pv version`, and `pv doctor`.
- [x] `completed` Add global flags: `--api-url`, `--project`, `--env`, `--format`, `--json`, `--no-color`, and `--verbose`.
- [x] `completed` Add Windows-first shell completion support, with bash/zsh/fish available for later packaging.
- [x] `completed` Add command-level tests for help, version, doctor, and completion output.
- [x] `completed` Add frontend root scripts for CLI build, lint, and test commands.
- [x] `completed` Run Rust build, Clippy, and Cargo tests once Rust/Cargo is available on the workstation.
- [x] `completed` Generate and commit `packages/cli/Cargo.lock` once Cargo can resolve dependencies locally.

## M2: Auth And Config

- [x] `completed` Implement `pv login --token-stdin`, `pv logout`, and `pv whoami` as the pre-interactive-auth foundation.
- [x] `completed` Store persistent development credentials through the OS credential store abstraction.
- [x] `completed` Store non-secret config in the platform app config directory.
- [x] `completed` Support `PENTAVAULT_TOKEN` without persisting CI/service credentials by default.
- [ ] `pending` Add mocked API integration tests for auth flows.
- [ ] `needs review` Verify the frontend `/device` approval page accepts the generated 6-character Better Auth user code.

## M3: Online Secrets

- [ ] `pending` Implement project and environment list/select commands in the Rust CLI.
- [ ] `pending` Implement online-only `secrets list`, `secrets get`, `secrets pull`, and `run -- <command>` in the Rust CLI.
- [ ] `pending` Ensure secret values default to masked output unless explicit `--plain`/script modes are used.
- [x] `completed` Add backend `/api/v1/cli/projects` for active-organization project discovery.
- [x] `completed` Add backend `/api/v1/cli/projects/:projectId/environments` for environment discovery.
- [x] `completed` Add backend `/api/v1/cli/projects/:projectId/secrets` for readable metadata without values.
- [x] `completed` Add backend single-secret and batch-value endpoints for `get`, `pull`, and `run`.
- [x] `completed` Add backend audit-event integration points for CLI secret list/read/inject operations.
- [x] `completed` Keep first usable CLI scope read-only by removing v1 write/access/cache command surface from the scaffold.

## M4: Secure Cache V1

- [ ] `pending` Add encrypted local cache storage after backend cache leases are available.
- [ ] `pending` Store cache data keys only through OS secure storage.
- [ ] `pending` Validate leases and revisions before serving cached secret payloads.
- [ ] `pending` Implement `cache status`, `cache warm`, `cache clear`, and `cache policy`.
- [ ] `pending` Add cache tamper/copy/expiry security tests.

## M5: Access Workflows

- [ ] `pending` Implement access request, cancel, and status commands.
- [ ] `pending` Show pending/approved/declined request states.
- [ ] `pending` Include request ids and audit metadata in user-visible output.

## M6: Packaging

- [ ] `pending` Add Windows release artifact and installer/winget-ready packaging.
- [ ] `pending` Add PowerShell completion installation docs.
- [ ] `pending` Add signed binary release process when certificates are available.
- [ ] `pending` Add macOS/Linux artifacts after Windows flow stabilizes.

## M7: Polish And Hardening

- [ ] `pending` Add startup, online read, cached read, and `pv run` benchmarks.
- [ ] `pending` Run a focused security review of cache envelope and authorization assumptions.
- [ ] `pending` Add redaction tests and fuzz tests for cache metadata parsing.
- [ ] `pending` Complete threat-model review before beta.

## Validation Log

- [x] `completed` 2026-05-08: `pnpm run lint` passed.
- [x] `completed` 2026-05-08: `pnpm run type-check` passed.
- [x] `completed` 2026-05-08: `pnpm test` passed.
- [x] `completed` 2026-05-09: `pnpm run cli:build` passed.
- [x] `completed` 2026-05-09: `pnpm run cli:lint` passed.
- [x] `completed` 2026-05-09: `pnpm run cli:test` passed.
- [x] `completed` 2026-05-09: `pnpm run lint` passed.
- [x] `completed` 2026-05-09: `pnpm run type-check` passed.
- [x] `completed` 2026-05-09: `pnpm test` passed.
- [x] `completed` 2026-05-09: `pnpm run cli:build` passed after device-code login support.
- [x] `completed` 2026-05-09: `pnpm run cli:lint` passed after device-code login support.
- [x] `completed` 2026-05-09: `pnpm run cli:test` passed after device-code login support.
- [x] `completed` 2026-05-09: backend `pnpm run lint` passed after `/api/v1/cli/*` contract work.
- [x] `completed` 2026-05-09: backend `pnpm run typecheck` passed after `/api/v1/cli/*` contract work.
- [x] `completed` 2026-05-09: backend `pnpm test -- tests/integration/api-cli.test.ts` passed.
- [x] `completed` 2026-05-09: `pnpm run lint` passed after final CLI/backend docs changes.
- [x] `completed` 2026-05-09: `pnpm run type-check` passed after final CLI/backend docs changes.
- [x] `completed` 2026-05-09: `pnpm test` passed after final CLI/backend docs changes.
