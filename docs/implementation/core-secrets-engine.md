# PentaVault Core Secrets Engine Implementation Plan

Completion Status: Not complete - implementation planning only
Status: planning only, no implementation started
Branch: `Abhash/core-secrets-engine`
Created: 2026-05-02

This document compares the supplied Core Secrets Engine plan with the current frontend and backend codebase, captures the required research findings, and defines an implementation path that fits the repository as it exists today.

## Scope

The supplied plan covers four product surfaces:

- Backend database, encryption, token resolution, proxy forwarding, analytics, rate limiting, and CLI-facing APIs.
- Frontend environment-scoped secrets, personal secrets, assignment UI, settings, and analytics dashboard.
- Security model changes for per-secret user access, device binding, token/IP restrictions, and async analytics.
- Rust CLI contract only. The CLI itself must not be implemented in this phase.

This is not a small feature patch. It changes the persistence model, the token contract, the secret read path, and the project UI model. The work should be treated as a multi-commit feature branch with schema migration gates and explicit backwards compatibility decisions.

## Research Scratchpad

### Encryption And Key Management

- AWS Secrets Manager uses envelope encryption through KMS data keys: the secret data is encrypted with a data key, and the data key is protected separately by a KMS key. This matches the plan's DEK/master-key model and is close to the backend's existing `secret_version` envelope fields. Source: https://docs.aws.amazon.com/secretsmanager/latest/userguide/security-encryption.html
- OWASP recommends Argon2id for password-derived secrets, with PBKDF2-HMAC-SHA256 acceptable when FIPS compatibility is required. This matters only if PentaVault derives keys from user-entered passwords. The current plan's transit-key derivation from session material should use HKDF, not password hashing. Source: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Web Crypto exposes `crypto.subtle.generateKey`, `deriveKey`, `encrypt`, and `decrypt`, but browser support for modern curves and extractability constraints must be verified before committing to browser-generated user encryption keys. Source: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
- libsodium sealed boxes encrypt to a recipient public key without revealing sender identity, and libsodium key exchange uses X25519-derived session keys. This is a better fit than hand-rolled ECDH if real client-held private keys become part of a later phase. Source: https://doc.libsodium.org/public-key_cryptography/sealed_boxes
- HashiCorp Vault's transit engine centralizes cryptographic operations and supports key versioning/rewrapping. The useful pattern here is explicit key versions plus rewrap operations, not exposing plaintext keys to callers. Source: https://developer.hashicorp.com/vault/docs/secrets/transit
- Doppler publicly describes secrets as encrypted at rest and in transit and emphasizes access controls/auditability, but its exact internal key hierarchy is not a drop-in design contract for PentaVault. Source: https://docs.doppler.com/docs/security

### Proxy Tokens And Direct Injection

- Direct CLI injection, as used by tools such as Doppler and Infisical, is ergonomic but necessarily places real secret values in the child process environment. It is suitable for local development, not for the highest-control workflow.
- Proxy/virtual-key gateway models, as used by Portkey and LiteLLM-style AI gateways, make it easier to add per-request analytics, budgets, upstream routing, and provider credential hiding. They add latency and require provider-specific request rewriting. Sources: https://portkey.ai/docs/product/ai-gateway/virtual-keys and https://docs.litellm.ai/docs/proxy/virtual_keys
- Environment variables can leak through process inspection, crash dumps, logs, subprocess inheritance, and accidental diagnostics. Direct mode needs explicit UX copy and should remain opt-in where higher-control proxy mode is required.
- HMAC-hashed token storage remains the right model: store only token hash, token prefix/start, metadata, and audit identifiers. Never log raw proxy tokens.

### Analytics Architecture

- Postgres range partitioning is a reasonable MVP choice for monthly `secret_access_events` partitions and avoids adding another database. Source: https://www.postgresql.org/docs/current/ddl-partitioning.html
- TimescaleDB would simplify time-series retention and aggregates, but it requires installing the extension. Do not assume Oracle Free Tier supports it unless the deployed database is self-managed and extension installation is confirmed. Source: https://docs.timescale.com/use-timescale/latest/hypertables/
- ClickHouse is stronger for high-volume analytical workloads, but it adds operational complexity and is unnecessary for MVP volume. Source: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- Analytics writes should be buffered/fire-and-forget from the request handler, but failures still need logging and backpressure protection so analytics outages cannot crash resolve/proxy traffic.

### Rate Limiting

- `@fastify/rate-limit` supports global or route-level configuration, custom `keyGenerator`, Redis backing store, and rate-limit headers including `retry-after`. Context7 confirmed route-level `config.rateLimit` and Redis store options.
- The plan's per-token per-second and per-token per-day limits are domain limits, not just route limits. They should live in a token policy/rate-limit service and use the Fastify plugin only as the outer per-IP/per-route shield.
- In-memory rate limits are acceptable only for local/MVP single-instance use. A Redis/Lua sliding-window implementation is required before horizontal scaling.

### Secret Storage, Rotation, And Versioning

- The backend already has immutable `secret_version` records with ciphertext, IV, auth tag, wrapped key provider/ref/ciphertext/IV/auth tag. That is the right place to build rotation unless a separate key table is proven necessary.
- Zero-downtime secret rotation usually requires versioned secrets, gradual credential rollout, previous-version grace periods, and auditability. PentaVault already has version rows, but not a full user-facing rotation workflow.
- Plaintext mode must not be presented as "unencrypted but safe." It should be "recoverable/base64 only, protected by auth but not cryptographically protected at rest."

### Rust CLI Contract

- Clap's derive API is a good fit for `vaultproxy login`, `init`, `run`, `secrets list`, `status`, and `logout` subcommands. Context7 confirmed subcommand enum patterns and external command handling.
- The Rust `keyring` crate is appropriate for OS credential storage, with platform backends for macOS Keychain, Windows Credential Manager, and Linux Secret Service/KWallet depending on environment. Source: https://docs.rs/keyring/latest/keyring/
- `reqwest` is the standard async HTTP client candidate for token-authenticated API calls and retry middleware integration. Source: https://docs.rs/reqwest/latest/reqwest/
- `std::process::Command` can spawn the wrapped child process with an augmented environment for direct or proxy mode. The CLI spec must clarify which values are real secrets, proxy tokens, or encrypted payloads.

## Current Project Status

### Backend

Current backend is in `PentaVault-Backend/`.

| Area | Current implementation | Gap against supplied plan |
| --- | --- | --- |
| IDs and schema style | `packages/db/src/platform-schema.ts` uses text IDs across project, secret, token, audit, and user relations. | The plan's raw UUID DDL cannot be copied directly. New tables must use the repository's text ID convention or an explicit cross-schema ID migration must be designed first. |
| Projects | `project` already has settings-like columns: `showAllVariablesToMembers`, `requireAccessRequest`, and `autoJoinForOrgMembers`. | No `project_settings` table. Need decide whether to migrate these columns into settings or keep them as project-level flags and add only new settings. |
| Environments | `secret.environment` is a plain string, defaulting to `development`. | No `project_environments` table, default environment rows, `environment_id`, or environment-scoped tokens. Need backfill from existing string values. |
| Secrets | `secret` plus immutable `secret_version` already provide encrypted versioned storage. | No `encryption_mode`, plaintext/base64 mode, personal scope, `created_by_user_id`-scoped personal visibility, `promoted_from_secret_id`, or per-secret access ACL. |
| Encryption | `packages/encryption/src/service.ts` already performs envelope encryption with random data keys and AES-GCM envelope fields. | The plan's separate `secret_encryption_keys` table overlaps with existing `secret_version` wrapped-key columns. Transit encryption and master-key rotation are missing. |
| User public keys | No `user_encryption_keys` table. | The plan simultaneously says full E2E is out of scope and asks for user public-key storage. This should be deferred unless a concrete client-held-key flow is added. |
| Proxy tokens | `packages/tokens` supports `pv_tok_` tokens, `compatibility` and `gateway` modes, token hashing, expiry, revocation, active session binding, and simple remaining/reset counters. | No `vp_tok_` prefix, direct/proxy naming, environment scope, device fingerprint, allowed IPs, total request cap, request count, last-used fields, or sliding-window/token-day limiter. |
| Resolve API | `apps/api/src/plugins/tokens.ts` exposes `/api/v1/resolve-bulk` for compatibility tokens and returns plaintext values. | No unified `/api/v1/resolve`, no CLI session auth path, no transit-encrypted response, no environment validation, no user-secret ACL check, and audit writes are awaited. |
| Gateway proxy | `apps/api/src/plugins/gateway.ts` has provider-specific gateway routes and a generic allowlisted proxy request endpoint. | No catch-all `/api/v1/proxy/:tokenId/*` model. Existing provider gateway should be evolved rather than replaced blindly. |
| Analytics | `audit_event` captures generic audit metadata. | No partitioned `secret_access_events`, analytics service, query APIs, per-secret timelines, device/IP summaries, or async pipeline. |
| Access policy | `packages/projects/src/access-policy.ts` centralizes project visibility and role rules. | Needs new helpers for environment visibility, secret metadata visibility, secret value access, token assignment visibility, analytics access, and personal secret promotion. |
| Tests | Backend has unit, integration, contract, and smoke tests for auth, projects, encryption, secrets, tokens, and gateway. | The new test matrix is broad and should be split by service: schema/access policy first, then secrets, resolve, gateway, analytics, and CLI API. |

### Frontend

Current frontend is in the repository root.

| Area | Current implementation | Gap against supplied plan |
| --- | --- | --- |
| Project navigation | `src/components/layout/project-layout.tsx` has Overview, Secrets, Team & Access, Audit log, Security, Usage, and Settings. | No Analytics nav item or `getProjectAnalyticsPath` constants. |
| Project overview | `src/app/(dashboard)/projects/[projectId]/page.tsx` renders `TokenAssignmentView`. | The basic assignment concept exists, but it is token-based, not explicit `user_secret_access`, and has no environment selector. |
| Secrets page | `src/app/(dashboard)/projects/[projectId]/secrets/page.tsx` has search, add dialog, and `SecretsList`. | No environment tabs, personal sandbox section, plaintext mode, or warning modal. |
| Schemas | `src/lib/api/schemas.ts` maps legacy org/project roles and models current secrets/tokens. | New API schemas are needed for environments, settings, ACLs, analytics, new token fields, plaintext metadata, and resolve responses. |
| Hooks | Existing hooks cover projects, team, secrets, tokens, audit, security, and usage. | Need hooks for environments, project settings, user secret access, analytics polling, CLI/session status if surfaced, and personal secrets. |
| Charts | `recharts` is already installed. | Analytics page still needs data models, chart components, polling, empty states, and admin-only gating. |

## Design Conflicts To Resolve Before Implementation

1. **Token prefix:** current backend emits `pv_tok_`; the plan examples use `vp_tok_`. Changing prefixes breaks existing tokens and frontend expectations. Recommendation: keep `pv_tok_` unless product explicitly wants a breaking migration.

2. **Mode names:** current backend uses `compatibility` and `gateway`; the plan uses `direct` and `proxy`. Recommendation: add API-facing aliases (`direct` -> `compatibility`, `proxy` -> `gateway`) during migration, then decide whether to rename storage enums later.

3. **Secret key table overlap:** current `secret_version` stores wrapped DEK material. A new `secret_encryption_keys` table may duplicate or conflict with versioned encryption history. Recommendation: keep key material version-bound in `secret_version` for MVP and add a key-rotation metadata table only if rotation requires it.

4. **Transit encryption source:** deriving a transit key from a web session token is risky if the frontend/CLI cannot reliably access the exact secret material. Recommendation: design an explicit CLI session secret or one-time response key agreement before implementing transit encryption.

5. **User public keys:** `user_encryption_keys` only makes sense if a client-held private key flow exists. Since full client-side E2E is declared out of scope, this table should be marked future-facing or omitted from MVP.

6. **Project settings split:** some settings already live on `project`. Recommendation: add `project_settings` only for new access-mode/token/device fields and keep existing columns until a later cleanup migration.

7. **Analytics storage:** partitioned Postgres is the right MVP default. Do not adopt TimescaleDB until the deployment target is verified to support extensions.

8. **Per-secret access migration:** current assignment is represented by issued tokens. The new `user_secret_access` table should be backfilled from active token assignments so existing member visibility is not lost.

9. **Plaintext mode policy:** plaintext/base64 secrets are materially weaker than encrypted secrets. Recommendation: allow only project owner/admin by default, make UI confirmation explicit, and never auto-convert plaintext secrets to encrypted without re-entry.

10. **Proxy forwarding shape:** current gateway accepts structured provider requests. A raw catch-all proxy is more powerful and riskier. Recommendation: keep provider allowlists and path validation, and introduce catch-all only for explicitly supported providers/hosts.

## Implementation Plan

### Phase 0 - Finalize Contracts

- Decide token prefix and storage/API mode naming.
- Decide whether user public keys are MVP or future.
- Define transit encryption mechanics for browser and CLI separately.
- Define analytics retention and partition creation policy.
- Confirm production database capabilities for extensions and partition maintenance.

Exit criteria:

- Written API contract for `resolve`, proxy forwarding, environments, settings, analytics, ACLs, and CLI sessions.
- No database work starts until compatibility decisions above are closed.

### Phase 1 - Database Foundation

- Add additive migration using text IDs, not raw UUID DDL.
- Create `project_environments` and backfill Development/Staging/Production per project.
- Add nullable `environment_id` beside existing `secret.environment`, backfill from slugs, then make required only after compatibility code is deployed.
- Create `project_settings` for new access-mode/token/device fields.
- Create `user_secret_access` and backfill from active token assignments.
- Extend `proxy_token` with environment, device, IP, request count, total cap, TTL, and last-used metadata.
- Create partitioned `secret_access_events` and initial partitions.

Exit criteria:

- Backend `pnpm run lint`, `pnpm run typecheck`, and schema tests pass.
- Existing tokens/secrets still resolve with current API.

### Phase 2 - Access Policy And Services

- Add access-policy helpers before changing routes:
  - can read secret metadata
  - can decrypt secret value
  - can manage environment
  - can view analytics
  - can manage user secret access
  - can promote personal secret
- Extend secret service for environment IDs, personal scope, plaintext mode, and explicit ACL checks.
- Add project environment service and project settings service.
- Add token policy service for environment/device/IP/TTL/max-total validation.
- Add async analytics writer with failure isolation.

Exit criteria:

- Unit tests cover deny-by-default policy behavior.
- Secret values and raw tokens are not logged in success or error paths.

### Phase 3 - Resolve And Gateway APIs

- Introduce `/api/v1/resolve` while keeping `/api/v1/resolve-bulk` as a compatibility wrapper.
- Implement validation order: token exists, revoked, expired, device, IP, rate limit, total count, user access, decrypt.
- Return direct-mode values only after ACL checks and optional transit encryption.
- Evolve gateway routes to log `secret_access_events` asynchronously.
- Add last-used token metadata updates outside the decryption critical path where possible.

Exit criteria:

- Integration tests cover valid, expired, revoked, device mismatch, IP blocked, rate limited, total cap exceeded, and revoked user access.
- Rate-limit responses include `Retry-After`.

### Phase 4 - Analytics APIs

- Build query service for project, secret, user, and token analytics.
- Support `from`, `to`, and `granularity=hour|day|week`.
- Restrict analytics to project owner/admin.
- Add indexes and partition maintenance tests.

Exit criteria:

- Analytics tests prove date filtering and counts.
- Analytics writes do not block resolve/proxy response success.

### Phase 5 - CLI API Contract

- Add backend-only CLI session endpoints:
  - `POST /api/v1/cli/sessions`
  - `GET /api/v1/projects/:projectId/cli/init`
  - `GET /api/v1/cli/status`
  - `DELETE /api/v1/cli/sessions/:sessionId`
- Bind CLI sessions to device fingerprint metadata.
- Do not implement the Rust CLI in this phase.

Exit criteria:

- Contract tests document response shapes and auth behavior.

### Phase 6 - Frontend Foundation

- Add API schemas and hooks for environments, settings, ACLs, analytics, and updated token metadata.
- Add environment selector to Overview and Secrets.
- Add environment tabs to Secrets.
- Add personal sandbox section and promote flow.
- Add plaintext warning modal and unlocked indicator.
- Update assignment UI to use `user_secret_access` semantics while preserving token status display.

Exit criteria:

- Frontend `pnpm run lint`, `pnpm run type-check`, and `pnpm test` pass.
- Existing project/member/auditor flows remain intact.

### Phase 7 - Analytics Frontend

- Create `src/app/(dashboard)/projects/[projectId]/analytics/page.tsx`.
- Add Analytics nav item between Usage and Settings.
- Build overview cards, timeline, top secrets, access mode breakdown, user activity, recent events, and device/IP list.
- Poll every 30 seconds with React Query.
- Gate analytics route to owner/admin and show a clear restricted state for members/auditors.

Exit criteria:

- Chart empty/loading/error states are complete.
- Mobile and desktop layout verified.

## Test Matrix

Backend tests should be added in this order:

- `project-access-policy`: environment, analytics, personal secret, and per-secret access decisions.
- `platform-schema`: new tables, indexes, enum compatibility, and migration assumptions.
- `encryption`: plaintext mode, envelope rotation metadata, no value logging.
- `secrets`: encrypted create/read, plaintext create/read, personal visibility, promote flow, revoked ACL denial.
- `tokens`: environment scope, device binding, IP restrictions, TTL, total cap, last-used metadata.
- `resolve`: complete validation pipeline and response shapes.
- `gateway`: proxy validation, upstream response logging, async analytics.
- `analytics`: event writes, date filtering, aggregation, admin-only access.
- `cli-api`: session lifecycle and project init contract.

Frontend tests should cover:

- Schema parsing for new backend responses.
- Environment selector behavior.
- Personal secrets visibility and promote affordances.
- Plaintext warning confirmation.
- Assignment UI filtering by environment and user access.
- Analytics page admin/member/auditor states.

## Operational Notes

- Add partition creation/retention to deployment operations before analytics volume grows.
- Decide whether analytics IP/country/device fields need a privacy notice or retention policy.
- Introduce Redis-backed rate limiting before running multiple API instances.
- Add secret/token redaction tests for logger metadata.
- Keep old endpoints and old schema fields during one release window if existing clients depend on them.

## Recommended First Commit Sequence

The supplied commit strategy is broadly right, but should be adjusted to the current codebase:

```bash
git commit -m "feat(db): add environments, settings, access acl, and access events"
git commit -m "feat(policy): centralize secret access and analytics permissions"
git commit -m "feat(secrets): add environments, personal scope, and plaintext mode"
git commit -m "feat(tokens): add environment scope, device binding, and token limits"
git commit -m "feat(resolve): add validation pipeline and async access events"
git commit -m "feat(gateway): record proxy access analytics"
git commit -m "feat(analytics): add access event queries"
git commit -m "feat(cli-api): add session and init contract endpoints"
git commit -m "feat(frontend): add environment and personal secret workflows"
git commit -m "feat(frontend): add project analytics dashboard"
git commit -m "test(secrets): cover encryption, personal scope, and acl"
git commit -m "test(resolve): cover token validation and rate limits"
git commit -m "test(analytics): cover event writes and aggregations"
```

## Current Recommendation

Do not start coding from the raw plan as written. First resolve the naming, ID, key-table, and transit-encryption conflicts above. The current backend already has important pieces of the target architecture, especially envelope-encrypted secret versions and gateway token flows, so the implementation should extend those systems instead of replacing them.
