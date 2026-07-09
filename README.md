# PentaVault

PentaVault is a security-first control plane for runtime secrets, project access,
proxy tokens, and audit visibility.

The public frontend repository also hosts the Rust CLI package. Local developer
checkouts may include the private backend repository at `PentaVault-Backend/`.

## Repository Layout

| Directory | Description | Visibility |
| --- | --- | --- |
| `src/` | Next.js 16 App Router dashboard | Public frontend |
| `packages/cli/` | Rust `pv` CLI package | Public frontend |
| `tests/e2e/` | Playwright browser automation | Public frontend |
| `docs/` | Product, review, implementation, and testing notes | Public frontend |
| `PentaVault-Backend/` | Fastify, Better Auth, Drizzle backend API | Private nested checkout |

## Requirements

- Node.js `>=22 <25`
- pnpm `>=10 <11`
- Rust `>=1.82` for the CLI package
- A running backend at `http://localhost:3001` for full online flows

## Frontend Development

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful local environment values:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For UI-only browser tests, Playwright starts the app with mock auth enabled.

## CLI Development

```bash
pnpm run cli:build
pnpm run cli:lint
pnpm run cli:test
```

The debug binary is written to `packages/cli/target/debug/pv.exe` on Windows.
Use `pv login --api-url http://localhost:3001` for the Better Auth device-code
flow, then use read-only commands such as `projects list`, `envs list`,
`secrets list`, `secrets get`, `secrets pull`, and `run`.

## Testing

Run the standard frontend checks:

```bash
pnpm run lint
pnpm run type-check
pnpm test
```

Run browser automation:

```bash
pnpm run test:e2e
pnpm run test:e2e:ui
pnpm run test:e2e:debug
```

Run backend checks from `PentaVault-Backend/`:

```bash
pnpm run lint
pnpm run typecheck
pnpm test
```

More detail is in `docs/testing.md`.

## Security Notes

- Never commit real secrets, session cookies, SMTP credentials, API keys, or
  database URLs.
- Frontend gates are UX only. Sensitive operations must be enforced by backend
  authorization and centralized project access policy.
- The CLI stores persistent credentials in the OS credential store and supports
  process-scoped `PENTAVAULT_TOKEN` for CI-style usage.
- CLI secret reads go through backend session/project/secret-access checks and
  must not bypass organization or project permissions.

## License

UNLICENSED. See `LICENSE`.
