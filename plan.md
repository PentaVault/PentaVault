# PentaVault Product Plan

Updated: 2026-04-23

## 1) Purpose

PentaVault is a runtime secrets control product for AI-assisted development. The product combines:

- a Next.js dashboard for administration, review, and team workflows
- a Fastify backend for auth, encryption, policy, audit, tokens, and provider gateways
- a CLI workflow for local development, project setup, tokenized env files, and runtime execution

The planning goal is to keep the dashboard, backend, and CLI moving as one product rather than as disconnected surfaces.

## 2) Product Position

PentaVault should not be a generic secrets vault clone. Its sharper wedge is local developer safety in the AI coding era:

- remove plaintext secrets from local env files
- issue revocable per-user proxy tokens
- prefer gateway delivery for supported providers so the real provider secret never reaches the developer machine
- keep compatibility mode available for unsupported services while documenting the in-process exposure tradeoff
- make audit, revoke, and team access easy enough for small teams to use daily

## 3) Current Stack and Constraints

- Frontend: Next.js 16 App Router, React 19, Tailwind CSS, TanStack Query v5.
- Backend: Fastify, Better Auth, Drizzle, PostgreSQL, envelope encryption, provider gateway packages.
- Package manager: pnpm only.
- Frontend proxy convention: `src/proxy.ts`.
- Backend contract source of truth: `PentaVault-Backend/docs/api/contracts.md`, backend route plugins, service types, and DB schema.
- Browser auth uses backend cookie sessions. Do not store raw auth tokens in browser storage.
- Display-once values include proxy tokens, API keys, MFA recovery material, and future machine credentials.

## 4) Current Implemented Capability Snapshot

### Implemented

- Dashboard shell with org switcher, project list, project detail pages, project sidebar, settings, and account surfaces.
- Project CRUD, archive/restore/delete flows, project-scoped roles, and project member management.
- Secrets list, add/import, update, delete, bulk edit/delete UI, masked values, and paste/file import patterns.
- Proxy token issue/revoke flows, one-time token reveal, and project overview token assignment UI.
- Backend org model with active organization context, default organization guard, org-scoped project slugs, and org billing placeholder schema.
- Backend secret versioning, encrypted secret storage, token hashing, raw-token display only at issuance, and project-scoped token list metadata.
- Backend gateway routes for supported providers and explicit allowlist behavior for generic proxying.
- Backend audit events, alert/recommendation foundations, access request route foundation, and project-scoped audit queries.
- Backend SMTP delivery abstraction, mandatory email verification, OTP-based verification, and Better Auth TOTP MFA support.
- Docker Compose local backend stack with Postgres, health checks, bootstrap migrations, and real local env loading.

### Partial

- Frontend auth UX does not yet fully expose the new OTP verification, resend, and MFA enrollment/challenge flows.
- CLI package exists in product structure, but the daily `login`, `init`, `run`, `status`, `whoami`, and `revoke` experience is not yet proven end to end.
- Organization settings exist, but org member lifecycle, invitations, billing, access-control defaults, and enterprise identity controls are still shallow.
- Secret versioning exists in backend storage, but user-facing history, rollback, redaction, and change review are not complete.
- Audit exists, but access logs by actor/secret, config-level history, export, retention controls, and forwarding are incomplete.
- Provider gateway routes exist, but SDK/client guidance, CLI configuration, observability, and production rollout controls still need polish.

### Missing

- First-class environments and configs inside each project.
- Branch or personal configs for developer-specific overrides.
- Secret references, secret value types, validation, notes, reminders, and missing-secret detection across environments.
- Scoped machine identities distinct from user-owned tokens.
- Integration syncs to deployment platforms, cloud secret managers, CI/CD, and Kubernetes.
- Webhooks on secret/config changes.
- Change request and approval workflow for high-risk secret changes.
- User groups, custom roles, SAML/OIDC SSO, SCIM provisioning, trusted IPs, and domain verification.
- Secret access logs that answer who read which secret, through what path, and when.
- Automatic rotation, dynamic/leased secrets, and zero-downtime rotation strategies.
- Terraform/OpenTofu provider, Kubernetes operator, SDKs, and public API docs for external automation.
- Analytics for stale secrets, unused secrets, token usage, gateway cost/usage, and team posture.

## 5) External Benchmark Lessons

Names are intentionally omitted here. The benchmark shows the market baseline for a mature developer-focused secrets platform:

- The core hierarchy is usually organization -> project -> environment -> config -> secret.
- Local development succeeds when CLI setup is fast, repeatable, and works across languages and frameworks.
- Teams expect secrets to move to CI/CD, hosting platforms, cloud secret managers, Kubernetes, and Terraform without manual copy/paste.
- Enterprise buyers expect granular RBAC, SSO, SCIM, user groups, trusted IPs, configurable audit retention, and export/log forwarding.
- Security teams expect secret history, rollback, redaction, access logs, approvals, rotation, stale secret analytics, and service identities.
- A strong CLI is table stakes, but PentaVault should differentiate by limiting real-secret exposure during AI-assisted local development through gateway mode and tokenized workflows.

## 6) Capability Gap Map

| Capability | Status | Priority | Notes |
|---|---:|---:|---|
| Org/project dashboard | implemented | high | Keep tightening stale-query, role, and delete edge cases. |
| Secret CRUD and batch import | implemented | high | Add upsert reporting, version history, rollback, and redaction UX. |
| Proxy tokens per user/secret | implemented | high | Keep one-time reveal invariant and add richer access logs. |
| SMTP verified-email auth | backend ready | high | Build frontend verification, resend, and recovery UX next. |
| TOTP MFA | backend ready | high | Build frontend setup/challenge/disable/recovery UX next. |
| CLI login/init/run | partial | critical | This is core to product-market fit. |
| Project environments/configs | missing | critical | Required before serious team and deployment workflows. |
| Service identities | partial | high | Current tokens are user/project oriented; add machine/service account model. |
| Audit and access logs | partial | high | Add secret access logs and export/retention controls. |
| Integrations and syncs | missing | high | Start with CI/CD, Vercel, GitHub Actions, Kubernetes, and one cloud secret manager. |
| Webhooks | missing | medium | Trigger redeploys, sync jobs, and internal automation. |
| Change approvals | missing | medium | Needed for team and enterprise trust. |
| Rotation and dynamic secrets | planned/missing | medium | Defer until environments/configs and service identities are solid. |
| Enterprise identity | missing | later | SSO/SCIM/groups/custom roles after team fundamentals land. |
| Compliance packaging | missing | later | Requires audit retention, admin controls, security docs, and ops maturity. |

## 7) Recommended Sequencing

### Horizon 1 - Close the auth and local-dev loop

Goal: make one developer able to sign up, verify, enable MFA, create a project, import secrets, generate tokens, and run locally.

- Build frontend OTP verification and resend flows.
- Build frontend MFA enrollment, QR/provisioning URI display, TOTP challenge, disable, and recovery-code handling.
- Build CLI `login`, `init`, `run`, `status`, `whoami`, and `revoke` against current backend contracts.
- Make `init` remove plaintext `.env` by default after successful import, unless the user opts out.
- Add `pentavault run` with token resolution, gateway-mode base URL guidance, stdout/stderr redaction, and clear compatibility-mode warnings.
- Add focused end-to-end smoke tests across frontend, backend, and CLI happy paths.

### Horizon 2 - Model environments and configs

Goal: move from "a project has secrets" to "a project has deployment-aware secret sets".

- Add `environment` and `config` tables with stable slugs, ordering, and project scope.
- Backfill current secrets into a default development config.
- Add config-aware secret names, versions, token issuance, audit, and gateway resolution.
- Add missing-secret detection across configs.
- Add environment/config picker to project pages and CLI setup.
- Add personal/dev override config support only after root config behavior is stable.

### Horizon 3 - Team controls and service identities

Goal: support real teams and non-human workloads without overusing personal user tokens.

- Add organization members and invitations UX that is separate from project members.
- Add service accounts with project/config-scoped access.
- Add service tokens for read-only production/CI use.
- Add token expiration, max-read, and revoke policies visible in the dashboard.
- Add secret access logs by actor, token, secret, config, and access channel.
- Add org-level defaults for project visibility, project roles, and member onboarding.

### Horizon 4 - Delivery integrations

Goal: let teams deploy without manually copying secrets.

- Add webhooks for config changes, token revokes, and rotation recommendations.
- Add first sync targets: GitHub Actions, Vercel, Kubernetes, and one cloud secret manager.
- Add sync status, last-run details, failure messages, and retry controls.
- Add a typed public API surface and SDK-generation plan.
- Add Terraform/OpenTofu resources for orgs, projects, environments, configs, secrets metadata, service accounts, and syncs.

### Horizon 5 - Change control, rollback, and security operations

Goal: make secret changes reviewable, reversible, and observable.

- Add config log view with secret add/update/delete events.
- Add version history per secret with restore-by-new-version, not pointer rewind.
- Add permanent redaction for historical values where policy allows it.
- Add change requests for add/update/delete operations with reviewer approval.
- Add alert workflows that connect probable leak detection to token revoke, session revoke, and provider rotation guidance.
- Add analytics for stale secrets, unused tokens, high-risk configs, and gateway usage.

### Horizon 6 - Enterprise readiness

Goal: satisfy larger buyers without compromising the small-team workflow.

- Add SAML/OIDC SSO, SCIM, verified domains, user groups, and custom roles.
- Add trusted IP controls for production configs and admin routes.
- Add audit export and log forwarding.
- Add configurable retention and billing/plan enforcement.
- Add CMK/BYOK or stronger key isolation as a paid enterprise capability.
- Add self-hosted or single-tenant deployment path only after operational runbooks are mature.

## 8) Product Principles

- CLI-first does not mean CLI-only. The dashboard must remain the source of policy, audit, and team intent.
- Gateway mode is the strongest story. Compatibility mode is useful but must stay honest about runtime process exposure.
- Raw secret values and raw proxy tokens are display-once or never-display values.
- Every mutation should leave an audit trail without leaking plaintext, token material, or provider credentials.
- Org-level membership and project-level access are different concepts and should stay distinct.
- Avoid adding enterprise controls before the solo/small-team flow is delightful and reliable.

## 9) Frontend Roadmap

### Immediate

- Wire OTP verification and MFA UX to the backend Better Auth endpoints.
- Finish route guards for verified email, MFA challenge states, and authenticated-only pages.
- Stabilize org switching and query invalidation across all org-scoped pages.
- Add user-friendly error copy for known backend codes.
- Keep project and secret bulk actions visually consistent and keyboard accessible.

### Next

- Add config/environment navigation to project pages.
- Add secret history, rollback, redaction, notes, and value-type validation UI.
- Add access logs and richer audit filtering.
- Add service account and service-token management.
- Add integration/sync pages only after backend contracts exist.

## 10) Backend Roadmap

### Immediate

- Keep auth/email/MFA endpoints covered by integration tests and failure-path tests.
- Add frontend-consumable error contracts for verification, MFA, and resend rate limits.
- Add migration tests for auth security schema and existing-user re-verification behavior.
- Add CLI-oriented contracts for login/init/run and token resolution.

### Next

- Introduce environments/configs and migrate current secret/token tables safely.
- Add service account and service token schema.
- Add secret access log tables distinct from general audit events.
- Add webhook delivery worker with retry, idempotency, signing, and delivery logs.
- Add sync target abstraction before adding many providers.

## 11) CLI Roadmap

### Immediate

- `pentavault login`: browser and headless device flows.
- `pentavault init`: import `.env`, create proxy tokens, write `.env.pv`, update `.gitignore`, and remove plaintext by default after confirmation.
- `pentavault run`: resolve compatibility tokens, preserve gateway tokens, inject only into the child process, and redact output.
- `pentavault status` and `whoami`: show active org, project, config, auth state, and device state.
- `pentavault revoke`: revoke a token or all tokens for the current device/project.

### Next

- Config/environment selection.
- Secret upload/download with explicit safety prompts.
- CI mode using service tokens.
- Local cache policy for metadata only, never raw secrets.

## 12) Pricing and Packaging Direction

### Free

- one user or very small team
- limited projects/configs/secrets
- local CLI flow
- limited audit retention
- basic gateway providers

### Pro

- multi-user teams
- project roles, token assignment, and revoke controls
- higher project/config/secret limits
- longer audit retention
- service tokens and core integrations
- priority support

### Team

- org member management, groups-lite, approvals, access logs, webhooks, and syncs
- rotation recommendations and security analytics
- expanded gateway usage

### Enterprise

- SSO/SCIM, custom roles, trusted IPs, log forwarding, custom retention, enterprise key controls, custom rate limits, dedicated support, and deployment isolation options

## 13) Risks and Mitigations

Risk: environments/configs arrive late and force rework.
- Mitigation: design the next secret/token schema migration around config scope before adding more integrations.

Risk: the product becomes a generic sync-first vault.
- Mitigation: keep gateway mode, tokenized local development, and AI-agent runtime exposure as the core story.

Risk: auth backend is ready but frontend UX leaves users stuck.
- Mitigation: prioritize verification and MFA screens before adding more dashboard pages.

Risk: integration breadth weakens security.
- Mitigation: add a sync target abstraction with strict allowlists, audit events, retries, and secret-redaction tests before scaling targets.

Risk: raw value exposure through logs or network responses.
- Mitigation: keep display-once contracts, output sanitization tests, and negative tests for plaintext/token leakage.

## 14) Validation Standards

Every product slice must include:

- typed backend and frontend contracts
- loading, empty, error, forbidden, and retry states
- backend-code-aware frontend errors
- audit events for sensitive mutations
- tests for success, known failure, and permission failure paths
- Docker/local env validation when runtime config changes

Standard validation commands:

```bash
pnpm type-check
pnpm lint

cd PentaVault-Backend
pnpm typecheck
pnpm lint
pnpm test
```

## 15) Next Execution Order

1. Ship frontend verification and MFA UX against the completed backend auth work.
2. Build the CLI happy path: `login`, `init`, `run`, `status`, `whoami`, `revoke`.
3. Design and migrate project environments/configs.
4. Add service accounts, service tokens, and secret access logs.
5. Add config history, rollback, and redaction.
6. Add first integration sync and webhook delivery system.
7. Add approval workflows and security analytics.
8. Add enterprise identity and compliance controls.
