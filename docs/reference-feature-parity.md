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
| Secret workspace | Environments, config branches, personal secrets, import, bulk edit/delete, encrypted versions and restore, folders, tags and workspace facets | Safe export and pagination | Partial |
| Secret lifecycle | Version envelopes, compromise states, rotation recommendations, bounded rotation schedules, due/overdue reminders and automatic rescheduling on value replacement | Provider rotation adapters, zero-downtime overlap, leases and retention enforcement | Partial |
| Change control | Config change requests, approvals, protected/private/shared branches | Policy templates, required reviewer rules, conflict previews | Partial |
| Access control | Central project policy, org/project roles, organisation groups with additive project grants, per-secret grants and requests, optional bounded expiries with token TTL clamping, and token-level exact IP/device/request policies | Custom roles and project-wide trusted IP policies | Partial |
| Machine identities | Scoped API keys and proxy tokens | Workload identities and cloud/Kubernetes/OIDC/JWT auth methods | Planned |
| Authentication | Password, device flow, passkeys, MFA, sessions, invitations | SSO, SCIM, LDAP and domain enforcement | Partial |
| Audit and activity | Project/org audit events, activity UI, bounded sanitized CSV/JSONL exports | Retention controls, signed reports, bounded telemetry | Partial |
| Detection | Leak signatures, alerts and rotation recommendations | Repository/data-source scanning, findings workflow, honey tokens | Partial |
| Integrations | AI provider gateway, CLI, encrypted outbound webhooks, and encrypted GitHub Actions/Vercel deployment syncs with environment/folder scope, version-aware automation, connection tests, retries and delivery history | Reusable app connections and additional provider adapters | Partial |
| Sharing | Config sharing plus immutable encrypted external shares with hashed fragment-only links, expiry, atomic view limits, passwords, verified-recipient/org scopes and revocation | Secret-request links, custom public-page branding and recipient email delivery | Partial |
| Dynamic secrets | Static encrypted values and proxy access tokens | Provider-issued short-lived credentials and lease revocation | Planned |
| Notifications | In-app stream, email queue, outbound webhooks and dead-letter replay visibility | Preferences and digests | Partial |
| Organization admin | Members, invitations, access groups, billing, API keys and sessions | Custom org roles, sub-organizations and product policies | Partial |
| Project administration | Team, settings, environments, analytics and access requests | Templates, archival recovery and asynchronous cleanup | Partial |
| PKI/KMS/PAM | Envelope encryption provider abstraction | External KMS, certificate lifecycle and privileged sessions | Planned |
| AI/MCP | Provider gateway with scoped secret resolution | Governed MCP endpoints, activity records and tool policies | Partial |
| CLI | Secure device login, online secret workflows, config branches and release artifacts | Lease-backed cache, benchmarks and signed binaries | Partial |
| Operations | Health checks, Docker builds and deployment handoff | Readiness detail, metrics, tracing, queues, graceful drains and SLOs | Partial |
| CI/CD | Full frontend/backend/CLI gates, coverage thresholds, clean database bootstrap, immutable migration checks, dependency review, CodeQL analysis and attested release artifacts | Deployment smoke promotion | Partial |
| Testing | Frontend unit/E2E plus backend unit/integration/contract/smoke suites with webhook, external-share and deployment-sync crypto, scope, concurrency, provider, API, proxy-header and UI coverage | Broader permission matrix, resilience, accessibility and browser coverage | In progress |

## Delivery Order

1. Strengthen the secret workspace and metadata model.
2. Add outbound webhooks, external sharing, and sync-safe event delivery.
3. Add groups, custom roles and workload identities; time-bound secret access is delivered.
4. Add rotation automation, scanning sources, and dynamic-secret leases.
5. Add enterprise auth, audit streams, external KMS, PKI, and PAM foundations.
6. Finish observability, migration safety, supply-chain CI, and broad resilience coverage.

Every capability must include backend authorization, audit behavior, tests, API contracts, frontend
UX where applicable, and documentation before this ledger is marked complete.
