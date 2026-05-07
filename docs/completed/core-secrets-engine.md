# Core Secrets Engine

Completion Status: Completed
Status: completed
Branch: Abhash/core-secrets-engine
Completed: 2026-05-07

## Summary

The core secrets engine roadmap is implemented for this branch. The old implementation-plan copy has
been moved out of `docs/implementation/` because it no longer represents planning-only work.

Completed slices:

- Contracts were finalized for token resolution, gateway forwarding, environments, project settings,
  analytics, per-secret access, personal-secret promotion, and CLI sessions.
- Database foundation exists for environments, project settings, user-secret access, personal-secret
  promotion requests, token constraints, and secret access events.
- Access-policy helpers are centralized in `PentaVault-Backend/packages/projects/src/access-policy.ts`.
- Resolve and gateway APIs enforce token policy before decryption/proxying and write access analytics
  asynchronously.
- Analytics APIs expose project, secret, user, and token views with owner/admin enforcement.
- CLI session/init/status/revoke endpoints exist without implementing the Rust CLI itself.
- Frontend schemas, hooks, project settings, environments, personal sandbox/promotion flows, token
  assignment views, plaintext warnings, and analytics UI are implemented.
- Analytics is now the canonical project URL; legacy usage/observability URLs redirect to analytics.

## Verification Notes

Manual audit compared this document against:

- `PentaVault-Backend/packages/db/src/platform-schema.ts`
- `PentaVault-Backend/packages/projects/src/access-policy.ts`
- `PentaVault-Backend/packages/secrets/src/`
- `PentaVault-Backend/packages/analytics/src/`
- `PentaVault-Backend/apps/api/src/plugins/{tokens,projects,analytics,cli}.ts`
- frontend project routes, constants, hooks, API schemas, and secret/security UI components
- backend integration tests for tokens, analytics, CLI, project configuration, gateway, and project access

Cleanup performed after the audit:

- updated backend API/security docs to describe `/api/v1/resolve`, analytics APIs, CLI APIs, project
  configuration, access grants, and personal-secret promotion
- made `/projects/:projectId/analytics` canonical in frontend route helpers and navigation
- kept `/projects/:projectId/usage` and `/projects/:projectId/observability` as legacy redirects
- removed stale observability route files that duplicated the analytics page

## Remaining Work

No implementation tasks from the core secrets engine roadmap remain in this branch.

Operational follow-ups that are intentionally outside this roadmap:

- production database rollout and migration execution
- any future Rust CLI implementation
- later distributed token-cache work if latency evidence justifies it
