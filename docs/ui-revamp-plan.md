# PentaVault UI Revamp — Master Plan

Status: **Plan for sign-off.** Phase 1 (project-selection bug) is implemented
this turn because it's an explicit bug report with a verified one-line fix and no
design ambiguity. Everything else awaits the decisions in §Decisions.

Derived from a 6-agent read-only audit of the frontend (+ backend gateway/billing/
auth surfaces). Every claim below carries file:line references from that audit.

Guiding constraints (from the master context doc + CLAUDE.md):
- Minimal dependencies; reuse existing shadcn/Radix primitives.
- Backend authorization is the source of truth; client badges/gates are UX-only.
- Ask first for: auth/session changes (SSO), schema-breaking/migration work,
  security-sensitive gateway changes.
- Exclude the legacy redirect-only route trees (`/dashboard/org/[orgId]/*`,
  `/dashboard/projects/*`) from all restyling — per CLAUDE.md they're redirects.
- Verify gate before every commit: `pnpm run lint`, `type-check`, `test`.

---

## Phase 1 — Project-selection bug fix ✅ (implemented this turn, S)

**Root cause:** On `src/app/(dashboard)/projects/page.tsx`, each row's card `<div>`
is `role="button"` with `onClick={onOpen}` → `router.push(...)` (791-811). The
selection `Checkbox` sits inside it (818-822); its `stopPropagation` guard is
spread onto the Checkbox's hidden `sr-only <input>` (`ui/checkbox.tsx:18-23`), not
the visible `<label>/<span>` the user actually clicks. The wrapper div (812-817)
has no guard. So a click selects (row flashes highlight) then bubbles to the card
and navigates — "selects for a second then opens." The kebab menu already proves
the fix pattern: it stops propagation on its real trigger (878-889) and never
navigates.

**Fix:** `onClick={(e) => e.stopPropagation()}` on the checkbox wrapper div, plus
`pointer-events-none` while hidden so only intentional hover-clicks select. Keeps
selection working, kills the navigation race. Ship as its own fix commit.

---

## Phase 2 — Floating bottom action bar (M)

Move the inline `anySelected` bulk strip (page.tsx:358-402: Deselect all / Select
all / count / Archive / Delete) into a fixed bottom bar modeled on the existing
floating Archived-projects button (433-453), reusing its `--app-max-width`
alignment and the existing `selectedIds`/`handleBulkArchive`/`handleBulkDelete`
handlers. Extract a shared `src/components/shared/bottom-action-bar.tsx` so the
Archive button and this bar share one implementation. Gate on `anySelected`,
animate in/out. **This is the "selected project actions float at the bottom" ask.**

## Phase 3 — Collapsible icon sidebar (M)

`DashboardNavLink` already implements icon-only + title tooltip when `collapsed`
(dashboard-nav-link.tsx:8-15,40-53) — no change to that component. Work:
- Add persisted `sidebarCollapsed` slice to `src/lib/stores/ui-store.ts`.
- Collapse toggle in each aside header; thread `collapsed` to every nav link.
- **Prerequisite:** add an `icon` field to `ProjectNavItem` and give each project
  nav item a lucide icon (project-layout.tsx:114-122 are text-only today), else
  collapsed project nav shows empty links.
- React the shell grid width (dashboard-shell.tsx `md:grid-cols-[220px_1fr]`) to
  the collapsed width. Collapsed rail still shows icons + small labels as asked.

## Phase 4 — Theme differentiation from Supabase (M) — NEEDS DIRECTION

The theme is a near-verbatim Supabase clone: accent `#3ecf8e`/`#00c573`
(Postgres-green), canvas `#171717`/`#0f0f0f`, the copied frost token, all in
`src/styles/globals.css`. Highest-leverage change = shift the accent hue off
emerald and retint neutrals a few degrees toward it. Edit only the accent tokens
(`--accent`, `--accent-strong`, `--focus-ring`, `--accent-border`, `::selection`,
body radial-glow greens), add a `--radius` token (~10-12px, away from pill CTAs),
optionally swap the heading font via `next/font` (no new dep). **Update
`.opencode/skills/design/DESIGN.md` in lockstep** so agents stop regenerating the
Supabase palette. Chosen direction pending (see Decisions).

## Phase 5 — Home page fully dark (M)

The marketing tree is authored in raw light Tailwind (`home-page.tsx:9`
`bg-white text-slate-900`); the app is dark-only so `dark:` variants never fire.
Replace literal light utilities with theme tokens across
`src/components/home/*` (header, hero, feature-grid, pricing, footer, home-cta):
`bg-white|bg-slate-50 → bg-background|bg-card`, `text-slate-900 → text-foreground`,
`text-slate-600/500 → text-muted-foreground`, `border-slate-* → border-border`,
`emerald-* → accent`. Swap hero's light blur blobs to low-opacity accent glows.
Depends on Phase 4 accent tokens being final.

## Phase 6 — Minimal animated tab switchers (M)

Replace Radix Tabs on the tokens/api-keys page with a segmented control + sliding
indicator (CSS/Tailwind translate only). **Preserve** the `?tab=` URL sync
(router.replace scroll:false) and the `accountTokensActiveTab` zustand slice
(api-keys/page.tsx:103-104,156-200) — there's one impl for both routes. Then apply
the same switcher to the connect panel (local useState, no sync to preserve).
Optional shared `src/components/ui/segmented-tabs.tsx`.

## Phase 7 — Uniform micro-animation pass (L)

No motion runtime dep — Tailwind v4 transitions + a small set of shared
`@keyframes` in globals.css keyed off Radix `data-[state=open/closed]`.
- **Fix first:** `ui/dialog.tsx` is a bare 12-line Radix re-export with zero
  enter/exit — wrap `DialogContent/DialogOverlay` with `data-[state]` fade+scale so
  every modal inherits polish.
- Standardize interaction states by extending the cva primitives (Button, Card,
  table rows, nav links) rather than per-page one-offs.
- Scope: ~35 pages (canonical dashboard ~28 + auth 5 + home 2). EXCLUDE legacy
  trees. Add `prefers-reduced-motion` guards (matching globals.css:204).
- Reduce text / add icons across pages as part of this pass (user ask).
- Optional single CSS-only dep `tw-animate-css` — see Decisions.

## Phase 8 — Connect provider expansion (M, backend + frontend) — NEEDS CONFIRM

The six "coming soon" providers (groq, mistral, deepseek, together, xai, fireworks)
already have a complete but never-instantiated dispatcher
(`createAiProviderGatewayService.forwardChat`, service.ts:266-307) driven by
`AI_PROVIDERS`. Wiring = (1) instantiate it in backend `server.ts` and pass into
`gatewayPlugin`; (2) add a parameterized `POST /api/v1/gateway/:provider/chat/completions`
reusing `chatCompletionsBodySchema` and the existing `resolveGatewayRequestContext`
token/secret flow, calling `forwardChat`; (3) flip `available:true` in
constants.ts. **OpenRouter** = pure data add (OpenAI-compatible). This touches the
security-sensitive gateway → confirm before backend work.

**Cloudflare Workers AI:** OpenAI-compatible BUT its endpoint embeds a per-account
id in the path, violating the "baseUrl is a fixed constant, no user input in URL"
SSRF guarantee. Options: (a) route via the existing generic allowlist proxy
(allowlist `api.cloudflare.com`), or (b) a per-secret path-template model change
needing the SSRF review. Not a plain catalogue add.

**Dokploy:** a deployment PaaS with **no chat-completions API** — it does not
belong in the LLM gateway. Recommend excluding it (or, if genuinely wanted, scope
it separately as a non-LLM integration like the github/stripe/supabase forwarders).

## Phase 9 — Tier badge on avatar (M, needs backend endpoint)

Plan is persisted (`organization_billing.plan`) and read for seat enforcement
(auth/service.ts:2583) but **no API exposes it** — billing/page.tsx:26 hard-codes
`currentPlanId='free'` and `AuthOrganizationMembership` has no `plan` field. Work:
- New backend `apps/api/src/plugins/billing.ts`: `GET` org billing snapshot →
  `{plan, seatsUsed}`, normalized via `billingEntitlements.normalizePlan`.
- Add `plan` to `AuthOrganizationMembership` (or a `useOrgBilling()` hook).
- Render a small Pro/Team pill in `profile-menu.tsx` beside the name, only when
  `plan !== 'free'`. **Cosmetic only — never gate privileged actions on it.**
- Replace the hard-coded plan in billing/page.tsx.

**Single-user elevation:** already run in a prior session (that user is on the
`team` plan, org owner, global admin). I'll re-verify against the live DB as part
of this phase; the badge then renders automatically for that user.

## Phase 10 — SSO (SAML + OIDC) (L, gated — auth change)

Fully aspirational today: no `@better-auth/sso` installed, no SSO plugin in
`packages/auth/src/core.ts` (email/password is the only sign-in method). Enabling
touches auth/session semantics (new sign-in provider, account linking,
JWKS/metadata storage) and needs `better-auth generate` schema — explicitly on
CLAUDE.md's "ask first" list. Scope: add `@better-auth/sso`, register the plugin,
generate schema/migration, new `settings/organization/sso` subpage next to
`access/` and `billing/`, gated **server-side** via
`billingEntitlements.hasFeature(plan,'sso')` (team-only). Depends on Phase 9
exposing plan. **No code until the auth change is signed off on its own.**

---

## Recommended order

1 (done) → 2 → 3 → 6 (interaction-heavy, no decisions) → **[await theme sign-off]**
→ 4 → 5 → 7 → **[await confirm]** → 8 → 9 → **[await auth sign-off]** → 10.

## Decisions needed (blocking the gated phases)

1. **Theme direction** (Phase 4/5): monochrome-minimal / indigo-violet /
   warm-amber / I-propose-exact-tokens. Also: radius change away from pills? heading
   font swap?
2. **Animation dependency** (Phase 7): CSS/Tailwind-only (0 deps) vs add one
   CSS-only `tw-animate-css` for ready-made Radix enter/exit.
3. **Connect scope** (Phase 8): wire real backend routes for the 6 OpenAI-compatible
   providers + OpenRouter now? Cloudflare via allowlist-proxy or defer? Confirm
   Dokploy excluded (non-LLM).
4. **SSO scope** (Phase 10): full working SSO / UI+scaffold only / plan-only —
   and SAML+OIDC both? This is an auth/migration change requiring explicit sign-off.
