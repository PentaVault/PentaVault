# PentaVault CLI Development Implementation Plan

Date: 2026-05-07
Branch: `Abhash/cli-development-implementation`
Status: planning draft

## Goal

Build a fast, polished, security-first PentaVault CLI for fetching, injecting,
creating, updating, and managing project secrets from the terminal. The CLI
should feel excellent on Windows first, while keeping a clean path to macOS,
Linux, CI, and servers.

The design must reduce repeated server fetches during heavy traffic without
turning local cache into an authorization bypass. Local cache is an accelerator,
not the source of truth.

## Priorities

1. CLI foundation and user experience.
2. Security and backend-enforced authorization.
3. Performance, low memory use, fast startup, and minimal server load.

## Research Summary

Research was gathered with Context7 MCP for Rust CLI and credential-store
libraries, plus official product and platform documentation.

Patterns from other tools:

- Doppler writes an encrypted fallback snapshot for `doppler run`; by default it
  ties decryption to the same Doppler token, supports fallback-only mode, and
  documents AES-256-GCM with PBKDF2. This is useful, but its indefinite offline
  fallback is too permissive for PentaVault's "verify before sending secrets"
  requirement.
- 1Password CLI uses a daemon cache on Unix-like systems to reduce API calls and
  improve performance, stores encrypted data in memory, and lets users disable
  cache. Their docs also note CLI caching is not currently available on Windows,
  which is important because PentaVault is Windows-first.
- Infisical supports offline reuse of secrets after a previous fetch. This
  confirms that secret CLIs commonly cache, but PentaVault should make offline
  behavior policy-driven rather than unconditional.
- AWS CLI IAM Identity Center uses browser/PKCE or device authorization flows,
  caches auth tokens to disk, refreshes when possible, and deletes cached
  credentials on logout. This is a good model for authentication ergonomics.
- Windows DPAPI protects data so that normally only the same logged-in user on
  the same computer can decrypt it. Windows Credential Manager creates or
  updates credentials in the user's credential set. These should be the default
  Windows building blocks.
- Linux Secret Service and macOS Keychain are the equivalent secure stores for
  cross-platform credential material. Secret Service stores secrets in a service
  running in the user's login session and supports locked collections.

## Language And Runtime Recommendation

### Recommendation: Rust

Rust is the best default for this CLI because it gives:

- Very fast startup and low idle memory.
- Single native binary distribution for Windows.
- Strong type safety for security-sensitive cache and auth flows.
- Mature CLI tooling through `clap`.
- Good secure-storage options through `keyring-rs`.
- Good crypto ecosystem with AEAD encryption, zeroization, and typed errors.

Recommended crates:

- CLI parsing: `clap` with derive API, `clap_complete` for shell completions.
- HTTP: `reqwest` with `rustls`, or a slimmer client if binary size becomes an
  issue.
- Async runtime: `tokio`, but keep command paths simple and avoid background
  work unless measured.
- Config paths: `directories`.
- Credential store: `keyring-rs`.
- Cache database: `rusqlite` or `redb`; prefer `rusqlite` if we want easier
  inspection/migrations, prefer `redb` if we want embedded Rust-only storage.
- Crypto: `aes-gcm` or `chacha20poly1305`, `argon2` only for user passphrase
  fallback, `zeroize` for sensitive buffers.
- UX: `console`, `indicatif`, `comfy-table`, `miette` or `color-eyre`.
- Tests: `assert_cmd`, `assert_fs`, snapshot tests for help/error output.

### Alternatives

Go:

- Excellent single binary and simple cross-platform story.
- Lower complexity than Rust for some teams.
- Good choice if the team is more comfortable in Go.
- Slightly weaker type-level modeling for security invariants than Rust.

TypeScript/Node:

- Fastest for sharing frontend types and developer velocity.
- Worse startup time, heavier runtime, and more packaging surface.
- Not ideal for a Windows-first, low-resource CLI unless speed is less critical.

Decision: start Rust unless the team has a strong maintenance reason to prefer
Go.

## Product Shape

Binary name options:

- `pv`: short and comfortable for daily use.
- `pentavault`: explicit and good for scripts.

Recommendation: ship both, with `pv` as the primary command and `pentavault` as
an alias where packaging allows it.

Core command map:

V1 usable scope is intentionally read-only while auth, policy enforcement, and
secret injection are hardened:

```text
pv login
pv logout
pv whoami

pv projects list
pv projects select <project>
pv envs list
pv envs select <environment>

pv secrets list
pv secrets get <name>
pv secrets pull --format dotenv|json|env
pv run -- <command>

pv config get|set|unset
pv doctor
pv completion powershell|bash|zsh|fish
pv version
```

Longer-term command map:

```text
pv login
pv logout
pv whoami

pv orgs list
pv projects list
pv projects select <project>
pv envs list
pv envs select <environment>

pv secrets list
pv secrets get <name>
pv secrets set <name> <value>
pv secrets delete <name>
pv secrets pull --format dotenv|json|env
pv run -- <command>

pv access request <secret>
pv access cancel <secret>
pv access status

pv cache status
pv cache warm
pv cache clear
pv cache policy

pv config get|set|unset
pv doctor
pv completion powershell|bash|zsh|fish
pv version
```

Output principles:

- Default output is beautiful and human-readable.
- Every read command supports `--json`.
- Secret-value commands support `--plain` and `--silent` for scripts.
- `pv run -- <command>` should inject environment variables without writing a
  plaintext `.env` file unless explicitly requested.
- No spinners or color when stdout/stderr is not a TTY.
- Errors include a short human message, suggested fix, and request id when
  available.

## Authentication Model

Preferred interactive auth:

1. V1 `pv login` starts the standard OAuth 2.0 Device Authorization Grant
   through Better Auth.
2. The CLI prints the frontend verification URL and a 6-character alphanumeric
   user code generated by Better Auth.
3. The user signs in on the frontend verification page and enters the code.
4. The CLI polls the Better Auth device token endpoint and stores the returned
   credential in the OS credential store.
5. Later versions can add browser PKCE as the preferred desktop path while
   keeping device authorization as the reliable fallback.

Persistent credentials must live in the OS credential store only. Access tokens
should stay short-lived and in memory where possible.

Windows default:

- Store refresh token/device credential in Windows Credential Manager.
- Protect cache data keys with DPAPI/user scope or through the credential store.
- Do not use machine-wide DPAPI for user secrets because that weakens isolation.

CI/service auth:

- Support explicit non-interactive token through `PENTAVAULT_TOKEN`.
- Do not persist CI tokens by default.
- Disable cache writes by default in CI unless `--cache` or policy allows it.
- Support short-lived service tokens with strict scopes.

Logout:

- Delete OS credential entry.
- Delete access token cache.
- Optionally keep encrypted secret cache but make it unusable without login.
- `pv logout --purge-cache` deletes everything.

## Secure Cache Architecture

The cache must answer two different needs:

- Fast repeated local reads.
- No permission bypass after access is revoked.

### Cache Storage

Windows path:

```text
%LOCALAPPDATA%\PentaVault\cli\cache\
%APPDATA%\PentaVault\cli\config.toml
```

Cross-platform later:

```text
macOS: ~/Library/Application Support/PentaVault/cli/
Linux: ~/.config/pentavault/ and ~/.cache/pentavault/
```

Config files may store:

- API base URL.
- selected org/project/environment ids.
- output preferences.
- cache policy preferences.

Config files must not store:

- plaintext secret values.
- refresh tokens.
- access tokens.
- cache encryption keys.

### Encryption Envelope

Use envelope encryption:

1. Generate a random cache data key per authenticated account/device.
2. Store encrypted secret payloads in the cache database with AEAD.
3. Store the cache data key only through OS secure storage.
4. Include metadata as AEAD associated data:
   - user id
   - org id
   - project id
   - environment id
   - secret id
   - secret version id
   - access grant id
   - cache policy version
   - cache lease expiry
5. If metadata changes, decryption fails or the entry is considered invalid.

This protects against copied cache files, local tampering, stale metadata, and
many accidental downgrade cases.

### Cache Lease

PentaVault should not simply say "if encrypted cache exists, use it forever."

Server should issue a signed cache lease when secrets are fetched:

```json
{
  "leaseId": "cache_lease_...",
  "subjectUserId": "user_...",
  "orgId": "org_...",
  "projectId": "project_...",
  "environmentId": "env_...",
  "allowedSecretIds": ["secret_..."],
  "accessGrantRevision": 42,
  "secretRevision": 108,
  "policyRevision": 7,
  "expiresAt": "2026-05-07T12:30:00Z",
  "offlineGraceUntil": null
}
```

Default behavior:

- Online commands validate auth first.
- If server is reachable, use ETag/delta sync to refresh metadata cheaply.
- If the lease is valid and revisions match, serve secrets from local encrypted
  cache.
- If lease is expired, revoked, or metadata revision changed, re-fetch from the
  server.
- If server is unreachable, only use cache if the org/project policy explicitly
  allows stale reads.

This gives speed without letting a deleted member or revoked secret keep working
indefinitely.

### Cache Modes

Recommended modes:

- `online` default: validate session and policy before serving cached secrets.
- `stale-if-error`: use cache during network outage for a bounded grace period
  if server policy allows it.
- `offline`: explicit admin-enabled mode only, with a visible warning and expiry.
- `no-cache`: fetch every time and do not write secret payloads.

CLI flags:

```text
--cache=auto|off|refresh|offline
--max-stale 15m
--no-cache
```

Environment variables:

```text
PENTAVAULT_CACHE=auto|off|refresh|offline
PENTAVAULT_TOKEN=...
PENTAVAULT_API_URL=...
PENTAVAULT_NO_COLOR=1
```

## Backend API Requirements

The CLI will need backend support to be fast and safe:

1. Auth endpoints for PKCE/device login or compatible Better Auth flow.
2. Token refresh endpoint with short-lived access tokens.
3. Batched secret metadata endpoint.
4. Batched secret-value endpoint.
5. ETag or revision-based sync:
   - org revision
   - project membership revision
   - environment revision
   - secret revision
   - access grant revision
6. Delta endpoint:

```text
GET /v1/cli/sync?projectId=...&environmentId=...&sinceRevision=...
```

7. Cache lease endpoint or lease returned with secret fetches.
8. Revocation epoch:
   - Increment when membership, access grants, or project policy changes.
   - CLI invalidates cached entries when epoch changes.
9. Audit events:
   - `cli.secret.list`
   - `cli.secret.read`
   - `cli.secret.inject`
   - `cli.cache.warm`
   - `cli.cache.offline_read`
   - `cli.access.request`
10. Admin policy controls:
   - allow cache yes/no
   - max cache TTL
   - allow offline grace yes/no
   - max offline grace
   - allow CI cache yes/no

## Fast Fetch Strategy

Avoid one API call per secret.

Use:

- Batch secret fetch by project/environment/name.
- Conditional requests with `ETag` / `If-None-Match`.
- Delta sync by revision.
- HTTP/2 keep-alive.
- Optional gzip or brotli for metadata.
- Lazy decryption of only requested secret values.
- Cache warm for common project/environment pairs.
- Avoid daemon in v1 unless benchmarks prove startup/network cost needs it.

Performance targets:

- `pv --help`: under 50 ms p50 on a normal Windows dev machine.
- `pv secrets get NAME` with warm cache and valid lease: under 80 ms p50.
- `pv secrets list` online metadata check with no changes: under 250 ms p50.
- `pv run -- <command>` warm cache setup: under 150 ms before child process
  starts.
- Idle memory: no resident daemon in v1.
- Binary size: measure, but prefer correctness and security over tiny binary.

## Security Threat Model

Threats to design for:

- Attacker copies cache files from disk.
- Attacker steals config files.
- User loses project access after cache is populated.
- Admin deletes or rotates a secret.
- Stale cache is used after a revoke.
- Malicious shell history captures secrets.
- Logs accidentally include plaintext secrets.
- A CI token is persisted on a build runner.
- MITM or proxy tampering with sync responses.
- Local malware running as the same user.

Mitigations:

- OS credential store for tokens and cache keys.
- AEAD encryption for cache payloads.
- Associated data binds payloads to user/project/secret/version/access grant.
- Short cache leases and revision checks.
- Server authorization for every refresh and every cache lease.
- Secret output defaults to masked/table form unless command asks for value.
- `--plain` requires direct user intent.
- Never log secret values.
- Redact secret-looking values in diagnostics.
- No persistent cache in CI by default.
- TLS required for all API calls.
- Signed server policy/lease response if offline grace exists.

Explicit limitation:

- If malware runs as the same logged-in user, it may be able to call the same OS
  credential APIs as the CLI. This is outside what local cache can fully solve.
  We can reduce exposure with short leases, optional biometric prompts later,
  and no daemon holding decrypted values.

## UX Details

Beautiful CLI does not mean noisy CLI. It should be calm, fast, and predictable.

Help output:

- Group commands by workflow.
- Use examples for common cases.
- Show selected project/environment where helpful.
- Offer shell completion setup.

Tables:

- Use compact tables for humans.
- Avoid wrapping secrets or ids in narrow terminals.
- Respect terminal width.

Error style:

```text
Error: access denied for secret DATABASE_URL

You do not currently have access to this project secret.
Next: run `pv access request DATABASE_URL` or ask a project admin.
Request id: req_...
```

Script style:

- `--json` for structured data.
- `--plain` for one secret value.
- `--silent` to suppress all non-value output.
- stable exit codes.

Exit codes:

```text
0 success
1 generic failure
2 usage/config error
3 auth required
4 permission denied
5 secret not found
6 network unavailable
7 cache unavailable or expired
8 server validation failed
```

## Package Layout

Recommended repo shape:

```text
packages/
  cli/
    Cargo.toml
    src/
      main.rs
      commands/
      api/
      auth/
      cache/
      config/
      crypto/
      output/
      platform/
    tests/
      cli_snapshots/
```

If the repo stays primarily frontend/backend with `pnpm`, add root scripts:

```json
{
  "scripts": {
    "cli:build": "cargo build --manifest-path packages/cli/Cargo.toml",
    "cli:test": "cargo test --manifest-path packages/cli/Cargo.toml",
    "cli:lint": "cargo clippy --manifest-path packages/cli/Cargo.toml -- -D warnings"
  }
}
```

## Implementation Milestones

### M0: Architecture Lock

- Decide Rust vs Go.
- Confirm CLI package location.
- Confirm auth flow with backend.
- Confirm cache policy semantics.
- Define API contract draft.

### M1: CLI Skeleton

- Create `packages/cli`.
- Add `pv --help`, `pv version`, `pv doctor`.
- Add global flags:
  - `--api-url`
  - `--project`
  - `--env`
  - `--format`
  - `--json`
  - `--no-color`
  - `--verbose`
- Add command snapshot tests.
- Add Windows shell completion.

### M2: Auth And Config

- Implement `pv login`, `logout`, `whoami`.
- Store credential in Windows Credential Manager via secure abstraction.
- Store non-secret config in app config path.
- Add CI token mode.
- Add auth integration tests with mocked API.

### M3: Online Secrets

- Implement:
  - `pv projects list/select`
  - `pv envs list/select`
  - `pv secrets list`
  - `pv secrets get`
  - `pv secrets pull`
  - `pv run -- <command>`
- No local secret cache yet except in-memory command lifecycle.
- Add audit events.

### M4: Secure Cache V1

- Add encrypted cache database.
- Add cache key stored in OS credential store.
- Add cache leases and revision validation.
- Add `pv cache status/clear/warm`.
- Add no-cache and refresh modes.
- Add tests proving copied cache files cannot decrypt without the OS credential.

### M5: Access Workflows

- Implement:
  - `pv access request`
  - `pv access cancel`
  - `pv access status`
- Show pending/approved/declined status.
- Add request id and admin-visible audit metadata.

### M6: Packaging

- Windows installer or winget-ready release artifact.
- PowerShell completion setup.
- Signed binaries if possible.
- macOS/Linux binaries after Windows path is stable.

### M7: Polish And Hardening

- Benchmarks for startup, cached reads, online reads, and `pv run`.
- Security review of cache envelope and API authorization.
- Fuzz cache metadata parsing.
- Redaction tests.
- Threat model review before beta.

## Test Plan

Unit tests:

- command parsing
- config read/write
- cache metadata validation
- cache lease expiration
- redaction helpers
- output formatters

Integration tests:

- login/logout with mocked API
- secrets get/list/pull
- `pv run` environment injection
- cache warm then cached secret read
- revoked access invalidates cache
- expired lease forces server check
- stale-if-error works only when policy allows it
- CI mode does not persist token by default

Security tests:

- cache file tamper fails decryption
- cache copied to different user/device cannot decrypt
- secret value never appears in logs
- config file never contains tokens or plaintext secrets
- revoked access cannot be read from cache after policy revision changes

Performance tests:

- startup benchmark
- warm-cache read benchmark
- online no-change sync benchmark
- large project list benchmark
- `pv run` benchmark with 10, 100, and 1000 secrets

## Open Decisions

1. Should offline secret reads ever be allowed, or only stale-if-error with a
   short server-issued grace period?
2. Should the first version include write commands (`set`, `delete`), or stay
   read/inject only until auth/cache is proven?
3. Is Rust acceptable for the team long term, or should Go be considered for
   maintainability?
4. Should `pv run` audit every injected secret or one aggregate event per run?
5. Should cache leases be signed JWT/PASETO-style tokens or opaque server
   records validated by sync?
6. What is the maximum allowed local cache TTL for developer machines?
7. Do enterprise admins need a "disable local cache entirely" policy at launch?

## Initial Recommendation

Start with a Rust CLI and online-only secret reads, then add encrypted local
cache after the API can return cache leases and revision metadata. Do not ship
offline indefinite cache in v1. Make Windows Credential Manager/DPAPI the first
secure storage target, abstracted behind a platform layer so macOS Keychain and
Linux Secret Service can follow cleanly.

The first implementation should prove:

- The CLI is fast and pleasant to use.
- Backend policy remains the source of truth.
- Cache improves repeated reads without bypassing revocation.
- Secrets do not leak into config, logs, shell history by default, or tests.

## Sources

- Context7 MCP: `clap` and `keyring-rs` documentation research.
- `clap` documentation: https://docs.rs/clap/latest/clap/
- `keyring-rs` documentation: https://docs.rs/keyring/latest/keyring/
- Doppler secret fallback files:
  https://docs.doppler.com/docs/automatic-fallbacks
- 1Password CLI reference:
  https://developer.1password.com/docs/cli/reference/
- Infisical CLI FAQ:
  https://infisical.com/docs/cli/faq
- AWS CLI IAM Identity Center authentication:
  https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html
- Microsoft DPAPI `CryptProtectData`:
  https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata
- Microsoft Credential Manager `CredWrite`:
  https://learn.microsoft.com/en-us/windows/win32/api/wincred/nf-wincred-credwritea
- freedesktop Secret Service API:
  https://specifications.freedesktop.org/secret-service/latest-single/
