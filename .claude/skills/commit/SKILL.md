---
name: commit
description: Create clean, verified, conventional-commit git commits for the PentaVault repos. Use when the user asks to commit changes, or after completing a unit of work that should be committed.
---

# Commit workflow (PentaVault)

Produce small, scoped, verified commits with messages that pass this repo's
commitlint rules. Never push unless the user explicitly asks.

## Golden rules
1. **Never commit to `main`/`master` directly.** Confirm the branch first
   (`git rev-parse --abbrev-ref HEAD`). If on a default branch, create a feature
   branch before committing.
2. **Stage explicitly.** List files by path — never `git add .` or `git add -A`.
   This avoids sweeping in unrelated or secret-bearing files.
3. **One logical change per commit.** If the diff spans unrelated concerns
   (e.g. a CLI feature + an unrelated UI fix), split it into separate commits.
4. **Verify before committing** (see below). Don't commit a red tree.
5. **Only commit when asked.** If intent is unclear, ask first.

## Before staging
- `git rev-parse --abbrev-ref HEAD` — confirm you're not on `main`.
- `git status --porcelain=v1` — get the true current state (the session-start
  snapshot may be stale).
- Scan for secret-bearing files (`.env*`, `*.pem`, `credentials*`, `*.key`).
  These are gitignored here, but if one appears staged, stop and flag it.

## Verify (green tree)
Run the checks for whatever changed. Fix failures before committing.

Frontend (repo root):
- `pnpm run type-check`  (runs `next typegen && tsc --noEmit`; if it fails only
  inside `.next/dev/types`, clear that cache and rerun — it's a stale artifact)
- `pnpm run lint`        (`biome check .`)
- `pnpm run test`        (`vitest run`)

Backend (`PentaVault-Backend/`):
- `pnpm run type-check`, `pnpm run lint`, `pnpm vitest run`

Rust CLI (repo root):
- `pnpm run cli:test` (`cargo test`), `pnpm run cli:lint` (`cargo clippy -D warnings`)

## Commit message format
Conventional Commits, validated by commitlint (`commitlint.config.js`):
- **Allowed types:** `feat`, `fix`, `perf`, `security`, `refactor`, `style`,
  `test`, `docs`, `chore`, `deps`, `revert`.
- Format: `type(scope): subject` — scope is optional but preferred
  (e.g. `cli`, `secrets`, `team`, `auth`, `change-requests`, `project-config`).
- Subject: imperative mood, lower-case, no trailing period.
- Header length and subject case are unrestricted, but keep the subject concise.
- **Body wraps at 200 chars/line** (commitlint `body-max-line-length`). Explain
  the *why*, not just the *what*. Use bullet points for multi-part changes.
- End every commit body with the trailer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

Write multi-line messages with a heredoc so the body formats correctly:

```bash
git commit -F - <<'EOF'
feat(scope): short imperative subject

Why this change and what it does, at a high level.

- bullet for each distinct part
- another part

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

## Pre-commit hook
Husky + lint-staged runs `biome check --write` on staged JS/TS/JSON/CSS
(`.lintstagedrc.js`). It may reformat files. If it does, the commit still
succeeds, but re-run `pnpm run lint`/`type-check` afterward to confirm the tip
is green — a hook reformat can occasionally shift something. Never bypass hooks
with `--no-verify` unless the user explicitly asks.

## Splitting a pre-existing blob
When a large batch of interwoven WIP is already staged as one unit, splitting it
into logical commits means intermediate commits won't each independently build
(they share dependencies). That's acceptable — but verify the **final tip** is
fully green (type-check + lint + tests), and confirm each staged file is
individually lint-clean so the pre-commit hook passes per commit.

## After committing
- `git log --oneline -N` to confirm.
- Report the commit(s) plainly. Do not push unless asked; if asked, push to a
  feature branch with `git push -u origin <branch>`, never to `main`.
