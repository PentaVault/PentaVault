# PentaVault Frontend Product Plan

## 1) Purpose

This plan defines how to build the PentaVault frontend and dashboard against the current private backend contract.

Primary goals:
- Ship a production-grade frontend hosted on Vercel.
- Integrate with the cloud-hosted backend over HTTPS APIs.
- Build dashboard features first, while keeping authentication implementation deferred.
- Preserve a strong security posture and avoid contract drift.

## 2) Confirmed Constraints

- Frontend stack: Next.js 16 App Router, React 19, Tailwind CSS, TanStack Query v5.
- Package manager: pnpm only.
- Next.js proxy convention: `src/proxy.ts` (not `middleware.ts`).
- Backend contract source of truth: `PentaVault-Backend/PLAN.md`, `docs/api/contracts.md`, and backend plugin/types code.
- Authentication implementation is deferred, but frontend architecture must remain Better Auth compatible.

## 3) Deployment Topology (Vercel + Cloud Backend)

Recommended production domains:
- Frontend: `https://app.<your-domain>` (Vercel)
- Backend: `https://api.<your-domain>` (cloud instance)

Required frontend env vars:
- `NEXT_PUBLIC_APP_URL=https://app.<your-domain>`
- `NEXT_PUBLIC_API_URL=https://api.<your-domain>/api`

Required backend alignment:
- `APP_URL=https://api.<your-domain>`
- `AUTH_TRUSTED_ORIGINS` includes frontend origin
- HTTPS-only in production

## 4) Backend Contract Snapshot (Frontend-Relevant)

Auth/session:
- `GET /api/v1/auth/session`
- `GET /api/v1/auth/sessions`
- `POST /api/v1/auth/sessions/revoke`
- `POST /api/v1/auth/api-keys`
- `POST /api/v1/auth/api-key/exchange`

Projects/team:
- `POST /api/v1/projects`
- `GET /api/v1/projects`
- `GET /api/v1/projects/:projectId`
- `PATCH /api/v1/projects/:projectId`
- `GET /api/v1/projects/:projectId/members`
- `POST /api/v1/projects/:projectId/members`
- `PATCH /api/v1/projects/:projectId/members/:userId`
- `DELETE /api/v1/projects/:projectId/members/:userId`

Secrets/tokens:
- `POST /api/v1/secrets`
- `POST /api/v1/secrets/import`
- `POST /api/v1/tokens`
- `POST /api/v1/tokens/revoke`
- `POST /api/v1/resolve-bulk`

Security operations:
- `GET /api/v1/projects/:projectId/audit`
- `POST /api/v1/projects/:projectId/alerts/probable-leak`
- `PATCH /api/v1/projects/:projectId/alerts/:alertId`
- `GET /api/v1/projects/:projectId/alerts`
- `GET /api/v1/projects/:projectId/recommendations`

Gateway endpoints:
- `POST /api/v1/gateway/openai/chat/completions`
- `POST /api/v1/gateway/anthropic/messages`
- `POST /api/v1/gateway/github/request`
- `POST /api/v1/gateway/stripe/request`
- `POST /api/v1/gateway/supabase/request`
- `POST /api/v1/gateway/proxy/request`

Domain invariants:
- Project roles: `owner | admin | member`
- Project status: `active | archived`
- Secret/token modes: `compatibility | gateway`

## 5) Frontend Architecture Plan

Routing model:
- Public marketing/entry routes under root and `(auth)`.
- Product dashboard under `(dashboard)` with project-scoped sections.

State model:
- TanStack Query for all server state.
- Local UI state for transient forms/dialogs.
- Auth/session context remains centralized in `AuthProvider`.

Network model:
- Single Axios client with cookie credentials enabled.
- Shared typed API modules per backend domain.
- Shared error parsing for user-safe messages and backend code mapping.

Security model:
- Never persist raw auth tokens in local storage/session storage.
- Keep backend cookie auth primary for browser workflows.
- Treat proxy tokens and API keys as sensitive display-once capabilities.

## 6) Phased Delivery Roadmap

### Phase 0 - Foundation (Completed)
- Next.js 16 baseline and pnpm workflow.
- Runtime hardening and env validation.
- Typed API/type scaffolding.
- CI/lint/type/build guardrails.

### Phase 1 - Dashboard Shell + Projects (Now)
- Build non-placeholder dashboard shell layout.
- Implement project list page with loading/empty/error states.
- Implement create-project flow (name + optional slug).
- Implement project overview page with role/status visibility.

Acceptance:
- User can view projects and create a project from dashboard UI.
- Query invalidation and state updates are reliable.

### Phase 2 - Secrets + Tokens Management
- Secrets page for single create and batch import.
- Tokens page for issue/revoke workflows.
- Explicit UX language for `gateway` vs `compatibility` tradeoffs.

Acceptance:
- Secrets and tokens can be created/revoked via UI.
- Backend failure codes map to clear UI outcomes.

### Phase 3 - Team + Audit + Security Center
- Team membership management page.
- Audit event viewer with filters and cursor pagination.
- Security center pages for alerts and rotation recommendations.

Acceptance:
- Owner/admin can operate alert lifecycle actions.
- Audit browsing is usable for incident review.

### Phase 4 - Onboarding + Settings Maturity
- First-run onboarding flow.
- API key creation UX for fallback CLI flows.
- Billing/usage placeholders remain explicit when backend routes are unavailable.

Acceptance:
- First-use path can bootstrap a project and secret workflow.

### Phase 5 - Better Auth Integration (Planned, Not Implemented Now)
- Implement login/register/device approval UX using Better Auth-compatible boundaries.
- Add route guards and server-aware session checks where needed.

Acceptance:
- Authentication UX exists without refactoring core dashboard data architecture.

### Phase 6 - Production Hardening
- Accessibility pass (keyboard, focus, contrast, semantics).
- Error boundary polish and retry flows.
- Performance pass and selective SSR/prefetch hydration.

Acceptance:
- Stable Vercel production behavior with contract-aligned UX.

## 7) Screen-to-Endpoint Matrix

- `/dashboard/projects` -> `GET /v1/projects`, `POST /v1/projects`
- `/dashboard/projects/[projectId]` -> `GET /v1/projects/:projectId`, `PATCH /v1/projects/:projectId`
- `/dashboard/projects/[projectId]/secrets` -> `POST /v1/secrets`, `POST /v1/secrets/import`
- `/dashboard/projects/[projectId]/tokens` -> `POST /v1/tokens`, `POST /v1/tokens/revoke`
- `/dashboard/projects/[projectId]/team` -> members CRUD endpoints
- `/dashboard/projects/[projectId]/audit` -> `GET /v1/projects/:projectId/audit`
- `/dashboard/projects/[projectId]/security` (new) -> alerts + recommendations endpoints
- `/dashboard/settings/api-keys` -> `POST /v1/auth/api-keys`

## 8) Data/UX Standards

Every data page must include:
- loading state
- empty state
- error state with retry
- permission/forbidden state where applicable

Every mutation must include:
- optimistic or explicit pending UI
- success confirmation feedback
- backend-code-aware error feedback

## 9) Authentication Future-Proofing (Current + Planned)

Current support:
- Centralized session bootstrap through `GET /v1/auth/session`.
- Cookie-based auth assumption with network-failure-safe fallback.

Planned Better Auth implementation:
- Keep all auth-sensitive decisions behind shared guard helpers.
- Add auth UI routes without changing API clients and dashboard query boundaries.
- Preserve compatibility with backend session and device approval endpoints.

## 10) UI Direction

Design system direction is documented in:
- `.opencode/skills/design/DESIGN.md`

Design requirements:
- Keep quality level inspired by modern developer tools.
- Avoid visual cloning of Supabase.
- Establish a distinct PentaVault color and interaction language.

## 11) Risks and Mitigations

Risk: Backend contract drift.
- Mitigation: Maintain typed API boundaries and contract-first updates.

Risk: Auth coupling before auth UI is implemented.
- Mitigation: Keep centralized auth provider + guard abstraction.

Risk: Security regressions in UX copy and token handling.
- Mitigation: Explicit sensitive-state components and display-once patterns.

Risk: Production misconfiguration between Vercel and backend.
- Mitigation: Validate env vars at startup and document deployment requirements.

## 12) Execution Order

1. Write and track this plan in repository docs.
2. Update active `todo.md` to reflect full phased plan.
3. Implement Phase 1 (dashboard shell + projects).
4. Continue through phases in order, validating lint/type/build each increment.
