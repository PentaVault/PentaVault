# PentaVault Cloud Handoff

Updated: 2026-07-10

## Runtime Topology

- Frontend: Next.js web app, normally port `3000`.
- Backend: Fastify API, normally port `3001`.
- Database: PostgreSQL shared by Better Auth and platform schemas.
- Billing: Polar; sandbox and production use separate tokens, products, and webhook endpoints.
- CLI: native Rust binary. It talks directly to the backend and stores persistent login only in the OS credential store.

Run `pnpm run db:bootstrap` during backend rollout before starting the API. It applies tracked auth and platform migrations, including retryable Polar webhook state.

## Frontend Environment

- `NEXT_PUBLIC_APP_URL`: public frontend origin.
- `NEXT_PUBLIC_API_URL`: public backend URL, normally ending in `/api`.

## Backend Production Environment

The parser in `PentaVault-Backend/packages/config/src/env.ts` is the source of truth. Core production values are:

- `NODE_ENV=production`
- `APP_URL`: public API origin, HTTPS.
- `WEB_APP_URL`: public frontend origin, HTTPS.
- `AUTH_TRUSTED_ORIGINS`: comma-separated exact origins.
- `AUTH_DEVICE_VERIFICATION_URI`: frontend device-approval URL.
- `DATABASE_URL`: PostgreSQL connection URL.
- `BETTER_AUTH_SECRET` or `JWT_SECRET`: authentication signing secret.
- `MASTER_KEY`: 64 hexadecimal characters for the 32-byte encryption key.

When billing is enabled, also set:

- `BILLING_ENABLED=true`
- `POLAR_ENVIRONMENT=sandbox|production`
- `POLAR_ACCESS_TOKEN`
- `POLAR_WEBHOOK_SECRET`
- `POLAR_PRO_PRODUCT_ID`
- `POLAR_TEAM_PRODUCT_ID`

Never copy sandbox credentials or product IDs into production. Keep runtime values in the deployment secret store, not GitHub Actions unless a build genuinely consumes them.

## Release And Branching

Keep `main` protected and deployable. Use short-lived feature branches, required checks, stale-review dismissal, code-owner review for sensitive paths, and no force pushes. A permanent `develop` branch is unnecessary and would duplicate release state.

The backend is a nested private checkout. Land backend commits first, then update the frontend repository's submodule pointer in a separate commit. Production deployment and secret rotation require explicit operator approval.

## Deployment Verification

Minimum proof after rollout:

1. `GET /healthz` succeeds for liveness and `GET /readyz` reports `db: connected`.
2. Browser login, logout, and session expiry work.
3. Organization switch clears old organization data.
4. CLI device login, `pv init`, `pv whoami`, and `pv secrets list` work.
5. Polar signed webhook delivery succeeds and a repeated event is idempotent.
6. A real secret read and gateway call produce audit events without logging values.
