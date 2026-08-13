# Reference Feature Parity Ledger

This ledger tracks product capabilities evaluated from the local reference application and maps
them onto PentaVault's architecture. The reference checkout is analysis-only and must never be
staged, committed, or added to `.gitignore`.

PentaVault keeps its existing Next.js, Fastify, Drizzle, Rust CLI, access-policy, and visual-system
conventions. Features are adapted to those boundaries instead of copying incompatible framework or
design-system code.

## Capability Matrix

| Domain | Current PentaVault baseline | Next improvement | Status |
| --- | --- | --- | --- |
| Secret workspace | Environments, config branches, personal secrets, import, bulk edit/delete, encrypted versions and restore, folders, tags and workspace facets, an append-only per-folder commit log (`#commits`) with parent linkage, database-enforced sequencing and range diffs that collapse net changes, and a folder-history panel in project settings that reads the log at ordinary project access (names only, never values) and compares any two commits; checkpoint restore ships as project snapshots | Safe export and pagination; restoring a single folder to a past commit | Partial |
| Secret lifecycle | Version envelopes, compromise states, rotation recommendations, bounded rotation schedules, due/overdue reminders, automatic rescheduling on value replacement, plus persisted `#rotation` schedules swept server-side with a project-scoped management API, a generated/provider strategy discriminator enforced by a database check constraint, and a routing executor that refuses to rotate a provider secret when no adapter is registered rather than overwriting it with a generated value, with bounded rollback windows, destroy-before-rotate priority, irreversible ciphertext destruction once the window closes, and no automatic retry after failure | Rotation UI, concrete provider adapters (Stripe/AWS/GitHub), leases and retention enforcement | Partial |
| Secret replication | A folder in one config branch kept in step with a folder in another (`#replication`), so a value shared across environments is defined once instead of copy-pasted. Cycle and chain-depth detection at configuration time, both ends pinned to one project, one source per target folder enforced by a unique index, copies marked with the link that owns them, and a sweep that carries on past a broken link. A secret the link does not own is never overwritten or deleted — it is reported as a conflict, which is a distinct status from a failure. Removing a link detaches its copies by default (`on delete set null`) rather than destroying values | Automatic sync on source write rather than on request; a drift preview before syncing | Partial |
| Change control | Config change requests, self-approval separation, configurable one-to-five reviewer quorum, protected/private/shared branches, plus a per-path approval-policy engine (`#policy`) enforced on merge, with environment scoping, named user/group approvers, unreachable-quorum guards a project-scoped CRUD API, and a management panel in project settings | A first-class rejection status; policy templates and conflict previews | Partial |
| Access control | Central project policy, org/project roles, organisation groups with additive project grants, per-secret grants and requests, optional bounded expiries with token TTL clamping, and token-level exact IP/device/request policies | Custom roles and project-wide trusted IP policies | Partial |
| Machine identities | Scoped API keys and proxy tokens, plus workload federation over **five** authentication methods — generic OIDC/JWT, **AWS IAM, Google Cloud, Azure managed identity and Kubernetes** — behind one verifier registry: in-repo JWT verification, JWKS caching with rotation refresh, mandatory workload allowlists that refuse a cluster-wide or tenant-wide trust, SSRF-guarded JWKS fetch, org-admin management API and settings UI, hashed `pv_mid_` access tokens that revoke on identity disable and resolve project grants live, secret-value reads on the workload surface (project-scope active secrets only — never personal-scope), and `pv identity login --method aws\|jwt`. AWS delegates verification to AWS itself: the workload signs `sts:GetCallerIdentity` locally and PentaVault replays it after checking endpoint, action, freshness and a signed audience binding, so it cannot become an outbound request forwarder and no AWS credential is ever stored | Lease-backed local caching; a per-method test button in the UI | Partial |
| Authentication | Password, device flow, passkeys, MFA, sessions, invitations, organisation single sign-on over **OIDC, SAML and LDAP**, and **SCIM 2.0 directory sync**. OIDC: authorization-code flow with PKCE S256, single-use state, mandatory nonce, `email_verified` enforcement. SAML: verification delegated entirely to `@node-saml/node-saml`, mandatory assertion signature, audience pinned to the SP entity ID. LDAP: TLS required, RFC 4515 filter escaping, empty-password binds refused before the directory is contacted. SCIM: owner-issued org-scoped bearer tokens stored hashed, `/scim/v2/Users` create/list/patch/delete, deprovisioning that revokes project tokens and memberships rather than only flagging a row | Group-to-role mapping from the directory | Partial |
| Audit and activity | Project/org audit events, activity UI, bounded sanitized CSV/JSONL exports | Retention controls, signed reports, bounded telemetry | Partial |
| Detection | Leak signatures, alerts and rotation recommendations | Repository/data-source scanning, findings workflow, honey tokens | Partial |
| Integrations | AI provider gateway, CLI, encrypted outbound webhooks, and encrypted GitHub Actions/Vercel deployment syncs with environment/folder scope, version-aware automation, connection tests, retries and delivery history | Reusable app connections and additional provider adapters | Partial |
| Sharing | Config sharing plus immutable encrypted external shares with hashed fragment-only links, expiry, atomic view limits, passwords, verified-recipient/org scopes and revocation | Secret-request links, custom public-page branding and recipient email delivery | Partial |
| Dynamic secrets | Static encrypted values and proxy access tokens | Provider-issued short-lived credentials and lease revocation | Planned |
| Notifications | In-app stream, email queue, outbound webhooks with dead-letter replay, and Slack/Teams chat formats that ride the same SSRF-hardened delivery path (secret values never rendered into a channel) | Preferences and digests | Partial |
| Organization admin | Members, invitations, access groups, billing, API keys and sessions | Custom org roles, sub-organizations and product policies | Partial |
| Instance operations | Operator console at `/settings/platform` gated on `AUTH_ADMIN_USER_IDS`: feature flags, announcements, and cached instance statistics (orgs, users, projects, secrets, identities, live tokens) | User administration, licence and usage reporting, signed audit reports | Partial |
| Project administration | Team, settings, permanent and self-expiring preview environments, analytics and access requests | Templates, archival recovery and generalized asynchronous cleanup | Partial |
| KMS | Envelope encryption abstraction; an external-KMS provider that fails closed with no local fallback; a concrete AWS KMS client binding every wrapped key to a PentaVault encryption context; a key registry that routes unwrapping by the provider and key reference on each envelope, including keys resolved at runtime so adopting one needs no restart; **per-organisation BYOK** (owner-only, verified by a wrap/unwrap probe before storing, retired rather than deleted so no data is stranded); and a resumable re-wrap migration covering every envelope-bearing table — secret versions, app connections, dynamic secret leases, webhooks, external shares and LDAP bind passwords — that moves data onto a new key without ever decrypting a value | GCP/Azure/KMIP clients; running the re-wrap automatically on adoption rather than by request | Partial |
| AI/MCP | Provider gateway with scoped secret resolution | Governed MCP endpoints, activity records and tool policies | Partial |
| CLI | Secure device login, online secret workflows, config branches, release artifacts, and `pv identity login`/`pv identity whoami` for workload authentication — the assertion is read from a file, stdin or an environment variable (never an argument, which would leak it into the process list and CI logs), and the resulting short-lived `pv_mid_` token is printed rather than written to the credential store. `--method aws` reads no assertion at all: it signs `sts:GetCallerIdentity` locally with SigV4 (using `ring`, already present beneath rustls, so no new dependency) and sends the signed request for replay, with the secret key never leaving the machine | Instance-metadata credential fallback, lease-backed cache, benchmarks and signed binaries | Partial |
| Operations | Separate liveness and bounded database readiness probes, graceful readiness drains, local-only Prometheus process/HTTP metrics, Docker builds and deployment handoff | Tracing, queue telemetry and SLOs | Partial |
| Runtime configuration | Feature flags with org/project/user targeting and deterministic percentage rollouts, cached in-process with stale-snapshot fallback; operator console at `/settings/platform` | Flag audit history and scheduled auto-expiry | Delivered |
| Operator announcements | Severity-ranked strip beneath the header with scheduled windows, audience and org scoping, and per-revision dismissal | Rich content and per-user targeting | Delivered |
| Rate limiting | Runtime-tunable per-bucket limits (global/auth/api/gateway/proxy) that fail closed to deployed defaults | Per-organization overrides and burst policies | Partial |
| CI/CD | Full frontend/backend/CLI gates, ratcheted coverage thresholds, clean database bootstrap, immutable migration checks, dependency review, CodeQL analysis, gitleaks secret scanning with env-file and reference-checkout guards, and attested release artifacts | Deployment smoke promotion | Partial |
| Testing | Frontend unit/E2E plus backend unit/integration/contract/smoke suites with webhook, external-share and deployment-sync crypto, scope, concurrency, provider, API, proxy-header and UI coverage | Broader permission matrix, resilience, accessibility and browser coverage | In progress |

## Delivery Order

1. Strengthen the secret workspace and metadata model.
2. Add outbound webhooks, external sharing, and sync-safe event delivery.
3. Add groups, custom roles and workload identities; time-bound secret access is delivered.
4. Add rotation automation, scanning sources, and dynamic-secret leases.
5. Add enterprise auth, audit streams, external KMS, PKI, and PAM foundations.
6. Finish observability, migration safety, supply-chain CI, and broad resilience coverage.

Runtime controls (feature flags, announcements, tunable rate limits) are delivered
and should be used to ship subsequent items dark rather than on long-lived
branches. See `docs/development-lifecycle.md`.

## Enterprise authentication: notes

OIDC, SAML and LDAP all produce a real better-auth session through one shared
`establishSession` helper, so they cannot drift into different admission rules.
SCIM sits alongside them, managing *membership* rather than sign-in.

An SSO email that already has a password account signs into that account. For
OIDC the domain allowlist plus mandatory `email_verified` make this safe; SAML
and LDAP have no `email_verified` equivalent, so there the allowlist plus the
fact that only the configured certificate or directory can vouch for the user
are what bound who may sign in.

Choices worth knowing:

- **SAML**: `wantAuthnResponseSigned` is off while `wantAssertionsSigned` is on.
  The assertion carries the identity and must be signed; requiring the outer
  response signature too would reject providers such as ADFS that sign only the
  assertion.
- **LDAP**: a bind with an empty password is an *anonymous* bind that succeeds
  on most servers, so an empty password is refused before the directory is
  contacted. The user's password is verified by re-binding as their DN on a
  fresh connection — never by comparing a hash read out of the directory.
- **SCIM** changes membership without a human session, authenticated only by an
  organisation-scoped token. Every organisation-safety invariant still applies:
  the last owner cannot be removed, nor can a personal-organisation owner.
  Members are provisioned as `developer` — an identity provider decides who
  belongs, not what they may do. Deprovisioning revokes project tokens and
  memberships; it does not delete the person's PentaVault account, which is not
  the directory's to decide.

Still outstanding: mapping directory groups onto PentaVault roles.

## Workload identity: notes

The five machine-identity authentication methods sit behind one verifier
registry, so the signature check and the JWKS cache have exactly one
implementation and each provider contributes only the claims that identify its
workloads. Three design points are worth knowing; the full reasoning is in
`PentaVault-Backend/docs/security/workload-identity.md`.

- **Every cloud method demands an allowlist.** A genuine token is not enough:
  Google signs tokens for every service account, and a cluster issuer signs one
  for every pod. A configuration that would trust a whole tenant, cluster or
  Google project is refused rather than accepted with a warning.
- **AWS is delegated, not verified.** There is no publicly verifiable AWS
  workload assertion, so the workload signs `sts:GetCallerIdentity` and
  PentaVault replays it. The request is validated first — endpoint, action,
  freshness, SigV4 scope, header allowlist — and must carry a *signed*
  `x-pentavault-audience` header, without which any captured `GetCallerIdentity`
  signature could be replayed here.
- **Kubernetes TokenReview is deliberately absent.** It would mean reaching an
  API server on a private network, which is what the outbound SSRF policy exists
  to prevent. Verification runs against the cluster's public OIDC issuer
  instead — the same mechanism EKS IRSA, GKE Workload Identity and AKS
  federation already use.

Every capability must include backend authorization, audit behavior, tests, API contracts, frontend
UX where applicable, and documentation before this ledger is marked complete.
