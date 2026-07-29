# Development lifecycle

How work moves from an idea to production across the PentaVault repositories.
Complements `CLAUDE.md` and `AGENTS.md`, which cover conventions rather than
process.

## Repositories

| Repository | Contents | Release vehicle |
| --- | --- | --- |
| Root (`PentaVault`) | Next.js frontend, Rust CLI (`packages/cli`) | Vercel deploy, CLI release artifacts |
| `PentaVault-Backend` | Fastify API, Drizzle migrations | Container image, release-please |

The two repositories version independently. A change spanning both needs a
compatible-in-both-directions plan — see [Schema and API changes](#schema-and-api-changes).

## Branching

- `main` is always releasable. Never push to it directly.
- Work happens on `<author>/<topic>` branches, for example `Abhash/New-Features`.
- Rebase onto `main` rather than merging it in, so history stays linear.

## The loop

1. **Pick up work.** Every change should trace to a tracked task or issue.
2. **Gate it behind a flag** if it is user-visible and non-trivial. The
   `#flags` package means unfinished work can ship dark instead of living on a
   long-lived branch. New flags default to off.
3. **Write the test first** where the behaviour is security-relevant —
   authorization, encryption, token policy, rate limiting. A test that would
   have caught the bug is worth more than one that documents the fix.
4. **Run the gates locally** before pushing (below).
5. **Open a PR.** CI must be green; do not merge on a red tree.
6. **Merge to `main`**, which triggers the release workflow.

## Required gates

Run these before you consider work finished. CI runs the same commands, so a
local pass is a reliable predictor.

### Frontend (repo root)

```bash
pnpm run lint
pnpm run type-check
pnpm test
```

### Backend (`PentaVault-Backend/`)

```bash
pnpm run lint
pnpm run typecheck
pnpm test
```

### Rust CLI (repo root)

```bash
pnpm run cli:lint
pnpm run cli:test
```

If `type-check` fails only inside `.next/`, clear the generated cache
(`rm -rf .next/dev/types .next/types`) and rerun — that is a stale artefact, not
a source bug.

## CI gates

| Workflow | Enforces |
| --- | --- |
| `frontend-ci.yml` | Lint, types, unit coverage, production build, Chromium smoke tests, Rust CLI checks, dependency review, Conventional Commits |
| `secret-scan.yml` | gitleaks over full history, no tracked `.env` files, `reference-app/` never committed |
| `codeql.yml` | Static analysis |
| Backend `ci.yml` | `ci:repo`, coverage, database bootstrap, migration immutability, dependency review, commit messages |

### Coverage ratchet

Coverage thresholds in `vitest.config.ts` sit just below the measured level.
When coverage rises, raise the thresholds. **Never lower a threshold to make a
red build pass** — that converts a signal into noise permanently.

Adding a large amount of new code can push the *aggregate* below a threshold
even when the new code is better covered than the average, because the ratio is
over the whole repository. The answer is still tests, not a lower number: find
the weakest files by uncovered branch count and cover those.

### Migration immutability

Backend CI rejects edits to migration files that already exist on `main`. A
migration that has run somewhere cannot be rewritten; add a new one.

## Schema and API changes

Frontend and backend deploy separately, so assume both versions run
simultaneously during a rollout.

- **Additive first.** Add the new column, field, or endpoint. Deploy. Migrate
  readers. Only then remove the old one, in a later release.
- **Never rename in place.** Add the new name, dual-write, migrate, drop.
- **Migrations must be forward-only and non-destructive** by default. Anything
  that risks data loss needs explicit sign-off before it is written.

Ask before: schema-breaking API changes, migrations risking data loss, changes
to auth/session/encryption/key-management semantics, adding external services,
weakening a CI guardrail, or rotating real keys.

## Releasing

Backend uses release-please: Conventional Commit types determine the version
bump, and merging the release PR tags and publishes.

- `fix:`, `perf:`, `security:` → patch
- `feat:` → minor
- `!` or `BREAKING CHANGE:` → major

The CLI publishes through `cli-release-artifacts.yml`.

## Operating a release

Two runtime controls exist so an incident does not require a redeploy:

- **Feature flags** (`/settings/platform`) — disable a misbehaving feature, or
  scope it to a rollout percentage, within about 15 seconds fleet-wide.
- **Announcements** (`/settings/platform`) — publish a maintenance or incident
  notice to the strip beneath the header, targeted by audience and scheduled by
  time window.
- **Rate limits** — tune per bucket at runtime; an unreadable policy falls back
  to the deployed default rather than removing the limit.

Rolling back a feature should be a flag flip. Reserve redeploys for changes that
flags cannot express.

## Authenticating a workload in CI

CI pipelines should not hold a human API key. Use a machine identity instead:
the pipeline proves who it is with an OIDC assertion its provider already
issues, and exchanges that for a short-lived `pv_mid_` token.

```bash
export PENTAVAULT_TOKEN=$(pv identity login \
  --organization "$PENTAVAULT_ORG" \
  --name ci-deploy \
  --assertion-env ACTIONS_ID_TOKEN \
  --token-only)

pv identity whoami          # confirm the identity and its project grants
pv secrets pull --project "$PROJECT_ID" --env production
```

Three properties are deliberate:

- The assertion is read from a file, stdin, or an environment variable — never
  a command-line argument, which is visible in the host process list and is
  routinely captured in CI logs.
- The resulting token is printed, not stored. It expires in minutes and belongs
  to the job that requested it, so writing it to the OS credential store would
  leave a usable credential on a shared runner.
- Project grants are read live on every request, so revoking access in the
  console takes effect immediately rather than at the next login.
