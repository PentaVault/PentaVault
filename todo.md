# PentaVault Frontend Initialization Todo

## Status Legend
- `[ ]` pending
- `[-]` in progress
- `[x]` completed
- `[!]` blocked or needs follow-up

## Working Rules
- This file is the source of truth for setup progress during this initialization.
- Update statuses here as each task is started, completed, or adjusted.
- No feature UI should be built in this phase. Setup and guardrails only.
- Backend internals must not be copied into public-facing files.

## Fixed Decisions For This Run
- Use Next.js 16 latest from `create-next-app@latest`.
- Use current backend contract as the source of truth where it conflicts with the prompt.
- Do not install `@radix-ui/react-badge` because it is not published on npm.
- Adjust scripts and CI for Next 16, which no longer uses `next lint`.
- Keep the backend protected by ignoring the top-level `PentaVault-Backend/` path.
- Use `pnpm` as the only package manager for this repository.

## Repository Reality Check
- Root currently contains frontend source and a nested private backend mirror.
- The backend repo is nested as `PentaVault-Backend/PentaVault-Backend/`.
- Ignoring `PentaVault-Backend/` at the root protects the private backend tree.

## Detailed Task Tracker

### 1. Root Ignore Rules
- [x] Create or replace root `.gitignore` with required frontend, env, tooling, and backend ignore rules.
- [x] Verify `PentaVault-Backend/` is ignored with `git check-ignore PentaVault-Backend/`.
- [x] Record verification output here.

Verification notes:
- `git check-ignore PentaVault-Backend/` returned `PentaVault-Backend/`.

### 2. Next.js Root Scaffold
- [x] Run `create-next-app` in `/home/ubuntu/PentaVault`.
- [x] Use TypeScript, Tailwind, ESLint, App Router, `src/`, alias `@/*`, no git init, and pnpm workflow.
- [x] Confirm app is created at the repo root rather than inside a nested folder.
- [x] Confirm expected root files exist after scaffolding.

Verification notes:
- Direct in-place scaffold was blocked because `create-next-app` rejects uppercase directory names.
- Safe fallback used: scaffold in a temporary lowercase directory, then copy generated root files into `/home/ubuntu/PentaVault`.
- Result is still a root-level app with `src/`, `public/`, `package.json`, `next.config.ts`, `tsconfig.json`, and related files.
- Next 16 template uses Tailwind CSS v4 and `postcss.config.mjs`, so no `tailwind.config.ts` is generated.

### 3. Dependency Installation
- [x] Install production dependencies in one pass.
- [x] Install dev dependencies in one pass.
- [x] Handle invalid dependency `@radix-ui/react-badge` without blocking the rest of setup.
- [x] Confirm lockfile and package manifests reflect installed packages.

Verification notes:
- Production dependencies installed successfully.
- Dev dependencies installed successfully.
- `@radix-ui/react-badge` was intentionally skipped because the package is not published on npm.
- `pnpm-lock.yaml` and `package.json` now reflect the installed dependency set.

### 4. Security And Config Guardrails
- [x] Replace deprecated `src/middleware.ts` with `src/proxy.ts` for Next 16.
- [x] Replace `next.config.ts` with hardened config.
- [x] Replace `tsconfig.json` with strict settings and proper excludes.
- [x] Add `src/lib/env.ts` as the central environment access point.
- [x] Create `.env.example` with safe sample values only.
- [x] Create local `.env.local` for development values.
- [x] Add `eslint.config.mjs`.
- [x] Add `.prettierrc`.
- [x] Add `.prettierignore`.
- [x] Update `package.json` scripts for pnpm-first linting and verification.

Verification notes:
- Config baseline replaced.
- Next 16 compatibility preserved by using direct ESLint commands instead of `next lint`.
- `proxy.ts` now uses `export function proxy(...)` and keeps matcher/header behavior.
- CSP was adjusted to avoid breaking local development and to only emit HSTS/upgrade headers on secure requests.
- Next 16 may rewrite some tsconfig fields (`jsx`) during type generation.

### 5. Git Hooks And Commit Guardrails
- [x] Initialize Husky.
- [x] Add `.husky/pre-commit` to run `lint-staged`.
- [x] Add `.husky/commit-msg` to run `commitlint`.
- [x] Add `.lintstagedrc.js`.
- [x] Add `commitlint.config.js`.
- [x] Ensure `prepare` script is present in `package.json`.

Verification notes:
- Husky initialized.
- Hook scripts include proper shebang and are executable.

### 6. Directory Structure And Placeholders
- [x] Create full `src/app` route tree with placeholder pages and layouts.
- [x] Create `src/components` tree with placeholder files.
- [x] Create `src/lib` tree with placeholder files.
- [x] Create `src/providers` tree with placeholder files.
- [x] Create `src/styles/globals.css` and wire it into root layout.
- [x] Keep placeholders minimal, valid, and free of feature logic.

Verification notes:
- Full placeholder map created.
- One prompt inconsistency required a safe deviation: dashboard overview lives at `/dashboard` instead of `src/app/(dashboard)/page.tsx`, because that path would collide with the public landing page at `/`.

### 7. Core Frontend Foundations
- [x] Add `src/lib/api/client.ts` with axios instance and interceptors.
- [x] Add `src/lib/auth/token.ts` with documented secure token storage strategy.
- [x] Add `src/lib/utils/cn.ts` helper.
- [x] Add constants, type placeholders, API placeholders, hook placeholders, and provider placeholders.

Verification notes:
- Axios, env, providers, hooks, and shared utilities are in place.
- Auth cookie handling follows current backend-managed session behavior.

### 8. Backend-Derived Types
- [x] Read backend schema and API routes from the private backend tree only for shape reference.
- [x] Derive frontend model types from current backend truth.
- [x] Reflect current backend role names, auth session shape, and API route conventions.
- [x] Avoid leaking backend-only notes or confidential docs.

Verification notes:
- Frontend types align to the current backend contract: `/api/v1` routes, `owner|admin|member` roles, Better Auth session endpoints, and current token/secret models.

### 9. CI And Public Documentation
- [x] Add `.github/workflows/frontend-ci.yml`.
- [x] Ensure CI uses Node 22 and pnpm commands.
- [x] Add public `README.md` for frontend and monorepo overview.
- [x] Avoid linking to or exposing private backend internals.

Verification notes:
- CI now uses `pnpm/action-setup`, pnpm cache, and `pnpm install --frozen-lockfile`.

### 10. Validation And Fixes
- [x] Run `pnpm run type-check`.
- [x] Run `pnpm run lint`.
- [x] Run `pnpm run build`.
- [!] Run `pnpm run dev` and confirm it starts on localhost:3000.
- [x] Fix every setup issue found during validation.
- [x] Update this file with final results and deviations.

Verification notes:
- `pnpm run type-check` passed.
- `pnpm run lint` passed.
- `pnpm run build` passed.
- `pnpm run format:check` passed.
- `pnpm run dev` starts successfully, but port `3000` is occupied by another local process, so Next binds to `3001`/`3002`.
- Deprecation warning resolved by migrating to `src/proxy.ts`.

## Final Completion Checklist
- [x] Backend path ignored from the public root repo.
- [x] Next.js frontend scaffolded at repo root.
- [x] Dependencies installed successfully.
- [x] Security proxy and config added.
- [x] Strict TypeScript and ESLint guardrails active.
- [x] Husky, lint-staged, and commitlint active.
- [x] Full placeholder directory map created.
- [x] API client and base utilities created.
- [x] Backend-derived frontend types created.
- [x] CI workflow created.
- [x] README created.
- [x] Type check passes.
- [x] Lint passes.
- [x] Build passes.
- [!] Dev server starts on `3000`.
- [x] No feature UI implemented in this phase.

Final checklist notes:
- The dev server is operational, but not on `3000` because an unrelated process already occupies that port in the environment.
- All setup work for this prompt is complete apart from reclaiming port `3000`, which was not changed automatically because the occupying process is not owned by this repo.
