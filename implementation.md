# Organizations Implementation

Persistent execution tracker for the organizations feature across:

- frontend: `/home/ubuntu/PentaVault`
- backend: `/home/ubuntu/PentaVault/PentaVault-Backend`

This file tracks scope, progress, decisions, validation, and remaining work.

---

## Status Legend

- `[ ]` pending
- `[-]` in progress
- `[x]` completed
- `[!]` blocked or follow-up required

## Progress Summary

- Overall progress: 36%
- Backend foundation: 75%
- Platform/org data model: 45%
- Frontend org UX: 40%
- Access requests flow: 0%
- Migration/backfill: 0%
- Validation/rollout: 0%

## Locked Decisions

- Use Better Auth organization plugin as the source of truth for organizations, memberships, invitations, and active organization context.
- Keep active organization in app state/session context rather than rewriting dashboard URLs to include org IDs.
- Auto-backfill existing users into personal orgs and migrate existing projects into orgs.
- Use org-level policy for private-project discoverability.
- Keep custom platform tables/logic for project visibility, project memberships, and access requests.
- Keep guest expiry enforcement request-time for MVP.

## Workstreams

### O-100 Better Auth Organizations Foundation

Status: [-]
Priority: high
Repos: backend, frontend
Objective: establish org-aware auth/session primitives without breaking current login/session flows.
Validation:

- backend typecheck
- auth route smoke tests
- frontend session bootstrap still works

Exit criteria:

- Better Auth org plugin is enabled
- auth schema includes org/member/invitation/session org fields
- frontend can read active organization and organization list

### O-200 Platform Org Data Model

Status: [-]
Priority: high
Repos: backend
Objective: add org-linked project visibility, discoverability policy, and access request persistence.
Validation:

- schema validation
- migration/backfill tests
- integration tests for project list and access control

Exit criteria:

- projects belong to organizations
- projects have visibility
- access_requests exists
- org discoverability policy exists

### O-300 Central Authorization Layer

Status: [ ]
Priority: high
Repos: backend
Objective: centralize org/project authorization for projects, secrets, tokens, audit, alerts, and recommendations.
Validation:

- integration tests for owner/admin/developer/readonly/auditor/guest

Exit criteria:

- all sensitive routes use the same org/project authz resolver
- guest expiry and auditor restrictions are enforced consistently

### O-400 Project Visibility And Create Flow

Status: [ ]
Priority: high
Repos: backend, frontend
Objective: make project creation inherit org defaults and make project list/access reflect visibility/discoverability.
Validation:

- backend integration tests
- frontend manual verification for open/private projects

Exit criteria:

- project create inherits org default visibility
- hidden vs visible-locked cards work per org policy
- request access entrypoint appears only when allowed

### O-500 Org Members, Invites, And Guests

Status: [ ]
Priority: high
Repos: backend, frontend
Objective: support org-level invites, guest memberships, expiries, and role-aware member management UI.
Validation:

- invite flow tests
- member list UI/manual checks

Exit criteria:

- org invites work
- guest expiry is enforced
- member list renders guest expiry indicators and org roles correctly

### O-600 Access Requests

Status: [-]
Priority: high
Repos: backend, frontend
Objective: ship create/review/cancel access request workflows.
Validation:

- endpoint integration tests
- reviewer UI manual checks

Exit criteria:

- members can request private project access
- admins/owners can approve or deny
- request state appears correctly in project cards and settings queue

### O-700 Auditor Experience

Status: [ ]
Priority: medium
Repos: backend, frontend
Objective: restrict secrets/tokens and expose only permitted audit/usage/member/project metadata.
Validation:

- role-based integration tests
- manual frontend navigation checks

Exit criteria:

- auditor can access audit/usage/member metadata only
- secrets/tokens routes and UI are blocked/hidden

### O-800 Migration And Rollout

Status: [-]
Priority: high
Repos: backend, frontend
Objective: migrate existing users/projects safely into the org model and keep local/prod environments stable.
Validation:

- migration dry run
- data backfill verification
- docker/local startup verification

Exit criteria:

- existing users get personal orgs
- existing projects are attached to orgs
- no destructive startup behavior remains

## Validation Log

- [x] Existing frontend/backend pre-org changes committed cleanly before org implementation.
- [x] Docker API startup no longer performs destructive schema pushes on every restart.
- [x] Better Auth org foundation added with custom roles and generated auth schema updates.
- [x] Session payload/types extended with `activeOrganizationId` support across backend and frontend.
- [x] Backend typecheck passed after org auth foundation changes.
- [x] Frontend typecheck passed after auth session type changes.
- [x] Backend exposes org list and set-active endpoints through `/api/v1/auth/organizations*`.
- [x] Frontend auth provider loads organizations and active organization state.
- [x] Dashboard header now exposes an org switcher.
- [x] Platform schema now models org-linked projects, project visibility, and access requests in code.
- [x] Bootstrap now performs additive org/project schema evolution and personal-org backfill logic.
- [x] Backend project routes now use active organization membership for create/list/get flows.
- [x] Default `/dashboard` route now redirects into the active organization route.
- [x] Frontend navigation now prefers org-scoped URLs for projects/settings/dashboard links.
- [x] Owner-only organization update/delete UI added to settings.
- [x] Backend access-request routes added for create/list/review/cancel.
- [x] Backend integration tests added for org auth endpoints and access-request routes.

## Open Risks

- Better Auth org schema generation may require auth DB migration/bootstrap updates before frontend can consume active org context.
- Existing project-only APIs assume `project_member` as the sole tenancy boundary; moving to org-aware access must avoid widening secrets/tokens access accidentally.
- Existing users/projects require careful backfill ordering to avoid orphan memberships or broken session/org context.
- Access request routes and reviewer/member UI are still not implemented, so private-project request workflows are incomplete.
- Old unscoped routes still exist in parallel with org-scoped paths and should be normalized or redirected more broadly in a later cleanup pass.

## Current Focus

- O-100 Better Auth Organizations Foundation
- O-200 Platform Org Data Model
- O-600 Access Requests
- Next: build access-request reviewer UI and complete owner/admin organization management flows
