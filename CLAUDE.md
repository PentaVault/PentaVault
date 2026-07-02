# CLAUDE.md

Working guide for Claude Code across the PentaVault repositories. Complements
`AGENTS.md` (read it too); where they overlap, both should stay consistent.

## What PentaVault is

A security-first secrets-management and runtime-proxy platform. It stores
encrypted secrets, issues scoped proxy tokens (`pv_tok_`), and proxies requests
to upstream providers (OpenAI, Anthropic, GitHub, Stripe, Supabase, and a
generic allowlist proxy). Access is governed by organisation and project RBAC,
with an audit trail, change-request approvals, and security alerts.

## Repository shape

- **Frontend** — repo root (`C:\Users\abhas\PentaVault`). Next.js 16 App Router,
  React 19, Tailwind v4 (CSS-variable theme in `src/styles/globals.css`),
  shadcn/ui + Radix primitives in `src/components/ui/`, TanStack Query +
  Zustand, axios client (`src/lib/api/client.ts`), Better Auth, Zod. Tests:
  Vitest + Testing Library + MSW (co-located `__tests__/`), Playwright e2e.
- **Backend** — `PentaVault-Backend/` (its own git repo). Fastify 5, Drizzle ORM
  (PostgreSQL), Better Auth. Single-package layout: internal packages import via
  a `#`-prefix map in the root `package.json` `imports` field (e.g. `#billing`,
  `#projects`). Route handlers in `apps/api/src/plugins/`; domain logic in
  `packages/`. Tests: Vitest (unit + integration) in `tests/`.
- **Rust CLI (`pv`)** — `packages/cli/`. clap + reqwest + keyring. A client-side
  tool; not a backend service.

## Required commands before finishing work

Frontend (repo root): `pnpm run lint`, `pnpm run type-check`, `pnpm test`.
Backend (from `PentaVault-Backend/`): `pnpm run lint`, `pnpm run typecheck`,
`pnpm test`. Rust: `pnpm run cli:lint`, `pnpm run cli:test`.

Never present work as done on a red tree. If `type-check` fails only inside
`.next/`, clear that generated cache (`rm -rf .next/dev/types .next/types`) and
rerun — it is not a source bug.

## Security model (source of truth is the backend)

- Never commit real secrets — tokens, session cookies, SMTP creds, API keys, DB
  URLs. `.env*` files stay gitignored.
- Frontend role gates are UX only. Every privileged action must be re-enforced
  server-side. Prefer deny-by-default when a permission case is unclear.
- CLI secret reads go through backend session/project/secret checks — never
  bypass org/project permissions.
- Proxy/gateway must keep SSRF protections (host canonicalisation,
  loopback/private-range blocking) and the upstream response-size cap. Token
  policy (hash, expiry, revocation, rate-limit window roll-forward, device/IP
  binding) lives in `packages/tokens/src/service.ts`; any reimplementation must
  stay behaviourally identical.

## Role model

Organisation roles: `owner` (full control), `admin` (admin without ownership
transfer), `developer` (normal member), `auditor` (canonical read/audit role;
legacy `readonly` normalises to it).

Project roles: `owner` (immutable, org-owner derived), `admin` (management),
`member` (normal access). `developer`/`readonly` exist only as legacy
enum-compatibility values. Access requests normalise API-facing roles to
`member`. Org owners hold immutable derived project access; project admins may
manage other members but not mutate their own project role.

Do not add a new role without updating the backend access-policy module, API
schemas, frontend type models, and tests together.

## Centralised access policy

Project authorization and visibility decisions live in
`PentaVault-Backend/packages/projects/src/access-policy.ts`. Route handlers,
services, stores, React components, and token code call this module rather than
duplicating role logic. When adding a capability that needs authorization, add
or reuse a policy helper with unit tests first, then wire the route.

## Routing (frontend)

The canonical route tree is the flat one referenced by `src/lib/constants.ts`:
`/projects/[projectId]/*`, `/settings/organization/*`, `/settings/account/*`,
`/activity`, `/change-requests`, `/dashboard`. Do not reintroduce parallel trees
under `/dashboard/org/[orgId]/*` or `/dashboard/projects/*`; legacy URLs are
redirected to canonical routes in `src/proxy.ts`.

## Conventions

- Commits: Conventional Commits enforced by commitlint (`commitlint.config.js`);
  types include `feat`, `fix`, `perf`, `security`, `refactor`, `style`, `test`,
  `docs`, `chore`, `deps`, `revert`. Small, scoped commits; stage explicitly (no
  `git add .`); end bodies with the `Co-Authored-By` trailer. A `commit` skill
  in `.claude/skills/commit/` captures the full workflow. Never push to `main`;
  never use destructive git commands unless asked.
- Tooling: Biome is the formatter/linter of record; markdownlint for docs. Do
  not reintroduce Jest/ESLint/Prettier. Keep frontend tests under
  `src/**/__tests__/**`, backend tests under `PentaVault-Backend/tests/`.
- Keep docs truthful — do not mark security architecture complete until backend
  enforcement and tests exist.

## When to ask first

Ask before: schema-breaking API changes; migrations that risk data loss;
changing auth/session, encryption, or key-management semantics; adding MCP
servers or external services; weakening any repo or CI guardrail; pushing,
deploying, or rotating real keys.
