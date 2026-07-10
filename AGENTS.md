# PentaVault Agent Guide

This is the public PentaVault frontend repository. It also contains the private backend checkout at `PentaVault-Backend/` when working locally.

## Project Shape

- Frontend: Next.js 16 App Router in `src/`
- Backend: Fastify/Better Auth/Drizzle platform API in `PentaVault-Backend/`
- Package manager: `pnpm`
- Frontend test runner: Vitest with jsdom
- Backend test runner: Vitest
- Frontend and backend formatter/linter: Biome

## Required Commands

Before finishing frontend work:

- `pnpm run lint`
- `pnpm run type-check`
- `pnpm test`

Before finishing backend work:

- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm test`

Run backend commands from `PentaVault-Backend/`.

## Security Model

- PentaVault is security-sensitive because it manages auth, project access, proxy tokens, secrets, audit logs, and organization membership.
- Never commit real secrets, tokens, session cookies, SMTP credentials, API keys, or database URLs.
- Never broaden role checks in UI only; backend policy/service enforcement is the source of truth.
- Treat frontend gating as UX only. Every sensitive backend route must enforce authorization.
- Prefer deny-by-default behavior when a permission case is unclear.

## Current Role Model

Organization roles:

- `owner`: full organization control.
- `admin`: organization/project administration without ownership transfer power.
- `developer`: member-facing role used for normal organization members.
- `auditor`: canonical read/audit role. Legacy `readonly` values must be normalized to `auditor` at API/UI boundaries and migrated in the database.

Project roles:

- `owner`: immutable root/project-owner access.
- `admin`: project management.
- `member`: normal project access.

Do not add new project roles without updating the backend access-policy module, API schemas, frontend type models, and tests.

## Centralized Access Policy

Project access decisions are centralized in:

- `PentaVault-Backend/packages/projects/src/access-policy.ts`

Use this module for:

- effective project role resolution
- project visibility decisions
- access-request role normalization
- audit/metadata read decisions
- project membership removal/self-leave rules

Do not duplicate project RBAC logic inside route handlers or React components. If a new capability needs authorization, add a policy helper and tests first, then call it from services/routes.

## Tooling Rules

- Do not reintroduce Jest, ESLint, or Prettier to the frontend unless the project intentionally reverses the Biome/Vitest baseline.
- Keep test files under `src/**/__tests__/**/*.test.{ts,tsx}` for frontend Vitest discovery.
- Keep backend tests in `PentaVault-Backend/tests/`.
- Use Biome to format supported source and JSON files.

## CLI Rules

- The CLI is Rust in `packages/cli/`; keep startup paths synchronous and small unless profiling proves async work is needed.
- Tokens belong only in `PENTAVAULT_TOKEN` for process-scoped automation or the OS credential store for persistent login.
- `.pentavault.toml` is project-local routing metadata only. Never add tokens, API keys, secret values, or session data to it.
- API keys are per-user or service-account capabilities scoped to one organization. Never share one personal key between collaborators.
- An API key must not create, list, or revoke other API keys. Key management requires a browser-approved user session.
- Offline secret cache work remains blocked until the backend supplies revocable leases and revision checks. Do not add an authorization-bypassing fallback cache.

## Branching

- `main` stays releasable and protected. Work on short-lived `codex/*` or feature branches and merge through reviewed pull requests.
- Do not add a long-lived `develop` branch; release automation already treats `main` as the integration branch.
- Keep frontend and backend commits independently reviewable. Commit the final backend submodule pointer in the frontend repo only after backend commits are complete.

## Documentation

- `todo.md` tracks review-derived bugs, security work, and remaining design decisions.
- `docs/review/2026-04-29.md` contains the first formal product review.
- Keep docs truthful. Do not mark security architecture as complete until backend enforcement and tests exist.
- `cloud.md` is the deployment and environment-variable handoff.
