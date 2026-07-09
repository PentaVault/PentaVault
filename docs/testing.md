# Testing And Debugging

Status: Active
Updated: 2026-05-09

This document describes the current local validation stack for the frontend,
backend, CLI, and browser automation.

## Frontend

Run from the repository root:

```bash
pnpm run lint
pnpm run type-check
pnpm test
```

Frontend unit and component tests use Vitest with jsdom. Keep test files under
`src/**/__tests__/**/*.test.{ts,tsx}` so discovery stays consistent.

## Playwright Browser Automation

Playwright is configured in `playwright.config.ts` and stores generated reports
in ignored artifact directories:

- `playwright-report/`
- `test-results/`

Run browser tests:

```bash
pnpm run test:e2e
```

Debug interactively:

```bash
pnpm run test:e2e:ui
pnpm run test:e2e:debug
pnpm run test:e2e:report
```

The Playwright web server starts Next.js on `127.0.0.1:3100` by default with
mock auth enabled. Override with:

```bash
PLAYWRIGHT_PORT=3200 pnpm run test:e2e
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm run test:e2e
```

Default debugging artifacts:

- screenshots only on failure
- videos retained on failure
- traces on first retry
- explicit screenshot attachments for the CLI device approval flow

## CLI

Run from the repository root:

```bash
pnpm run cli:build
pnpm run cli:lint
pnpm run cli:test
```

CLI tests cover command parsing, device-code display formatting, credential
redaction, bearer headers, mocked online project listing, and dotenv secret
pull output.

## Backend

Run from `PentaVault-Backend/`:

```bash
pnpm run lint
pnpm run typecheck
pnpm test
```

Backend CLI integration tests live in
`PentaVault-Backend/tests/integration/api-cli.test.ts`. They verify session
creation, project/environment discovery, metadata reads, value reads, audit
events, token status, revocation, and permission-denied behavior.

## Security Expectations

- Tests must not commit real tokens, cookies, API keys, SMTP credentials, or
  database URLs.
- Browser tests use mock auth unless the test explicitly targets a local backend
  environment.
- Secret values may appear only inside local test fixtures or ignored test
  artifacts.
- CLI output tests should assert that auth tokens are not echoed.
