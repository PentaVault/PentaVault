# PentaVault Frontend Development Todo

## Status Legend
- `[ ]` pending
- `[-]` in progress
- `[x]` completed
- `[!]` blocked or needs follow-up

## Working Rules
- Use `pnpm` only.
- Keep backend contract as source of truth.
- Keep authentication implementation deferred, but maintain Better Auth compatibility.
- Keep token, API key, and session handling security-first.
- Validate with `pnpm run lint`, `pnpm run type-check`, and `pnpm run build` after meaningful increments.

## Plan Tracking

### 0. Planning and Tracking Documents
- [x] Create `plan.md` with full frontend roadmap and phased delivery plan.
- [x] Replace `todo.md` with roadmap-aligned implementation tracker.

### 1. Phase 1 - Dashboard Shell + Projects
- [x] Build production-ready dashboard shell layout (header/sidebar/project context).
- [x] Implement projects list page with loading/empty/error/refresh handling.
- [x] Implement project creation flow with contract-safe validation.
- [x] Implement project overview page with role/status-aware sections.
- [x] Add shared API error-to-UX mapping for project routes.
- [x] Run validation checks for Phase 1 (`lint`, `type-check`, `build`).

### 2. Phase 2 - Secrets + Tokens
- [x] Implement secrets page (single create + batch import).
- [x] Implement tokens page (issue + revoke).
- [x] Add mode-aware UX (`compatibility` vs `gateway`) with security copy.
- [x] Add mutation feedback and retries across secrets/tokens flows.
- [x] Run validation checks for Phase 2.

### 3. Phase 3 - Team + Audit + Security Center
- [x] Implement team membership management page.
- [x] Implement audit viewer with filters and cursor pagination.
- [x] Implement project security page for alerts and recommendations.
- [x] Add owner/admin permission-aware actions and forbidden states.
- [x] Run validation checks for Phase 3.

### 4. Phase 4 - Onboarding + Settings Maturity
- [x] Implement onboarding flow for first project and first secret import.
- [x] Implement settings API key page (create and display-once UX).
- [x] Keep usage/billing pages explicit when backend capability is unavailable.
- [x] Run validation checks for Phase 4.

### 5. Phase 5 - Auth Implementation (Deferred, Planned)
- [ ] Implement Better Auth-compatible login/register/device approval UI.
- [ ] Add route guard patterns using centralized auth boundaries.
- [ ] Add server-aware auth checks where needed without breaking dashboard architecture.
- [ ] Run validation checks for Phase 5.

### 6. Phase 6 - Production Hardening
- [ ] Accessibility pass (keyboard/focus/contrast/semantics).
- [ ] Error handling and retry UX hardening.
- [ ] Performance pass (query defaults, selective SSR hydration where useful).
- [ ] Deployment verification for Vercel + backend cloud instance.

### 7. Design System Update
- [x] Rewrite `.opencode/skills/design/DESIGN.md` to remain high-quality but visually distinct from Supabase.
- [x] Update color tokens, typography choices, component style rules, and prompt guidance.

## Deployment Readiness Checklist
- [ ] Vercel env vars configured: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`.
- [ ] Backend trusted origins include frontend production origin.
- [ ] Frontend and backend communicate over HTTPS only.
- [ ] Production smoke check of auth session bootstrap and core project routes.
