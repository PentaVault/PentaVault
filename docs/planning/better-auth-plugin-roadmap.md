# Better Auth Plugin Roadmap

Date: 2026-05-07
Status: planning draft

## Goal

Use Better Auth plugins for authentication and account-management capabilities
where they fit PentaVault, while keeping PentaVault-specific backend policy,
audit, encryption, and project access checks as the source of truth.

This plan intentionally removes Stripe from the current scope. Payments and
subscriptions are future work and should be planned with billing, product
packaging, invoices, and organization-level subscription policy later.

## Research Sources

- Better Auth plugin catalog: https://better-auth.com/docs/plugins
- Last Login Method: https://better-auth.com/docs/plugins/last-login-method
- Captcha: https://better-auth.com/docs/plugins/captcha
- JWT: https://better-auth.com/docs/plugins/jwt
- Admin: https://better-auth.com/docs/plugins/admin
- API Key: https://better-auth.com/docs/plugins/api-key
- Device Authorization: https://better-auth.com/docs/plugins/device-authorization
- Organization: https://better-auth.com/docs/plugins/organization
- Passkey: https://better-auth.com/docs/plugins/passkey
- Two-Factor Authentication: https://better-auth.com/docs/plugins/2fa

Context7 MCP was also used against `/better-auth/better-auth` to verify the
current Better Auth plugin APIs and schema expectations.

## Current PentaVault Baseline

The backend already uses Better Auth in
`PentaVault-Backend/packages/auth/src/core.ts`.

Already configured:

- `emailOTP`
- `twoFactor`
- `bearer`
- `deviceAuthorization`
- `@better-auth/api-key`
- `organization`

Already represented in the generated auth schema:

- `two_factor`
- `device_code`
- `apikey`
- `organizations`
- `organization_members`
- `organization_invitations`

Not yet configured:

- `lastLoginMethod`
- `captcha`
- `jwt`
- `admin`
- `@better-auth/passkey`

Important current custom layers:

- `PentaVault-Backend/packages/auth/src/service.ts` wraps Better Auth with
  PentaVault-specific organization defaults, invitations, security emails,
  MFA rotation, API key fallback, and account flows.
- `PentaVault-Backend/apps/api/src/plugins/auth.ts` exposes stable PentaVault
  API routes and maps Better Auth errors into product error contracts.
- `PentaVault-Backend/packages/projects/src/access-policy.ts` is the canonical
  project access policy. Do not replace this with frontend gating.

## Plugin Decisions

| Plugin | Decision | Reason |
| --- | --- | --- |
| Stripe | Defer | Not needed until billing and subscriptions are actively designed. |
| Last Login Method | Add | Low-risk UX improvement, especially once GitHub and Google sign-in exist. |
| Captcha | Add carefully | Useful for bot defense, but must not create constant visible friction. |
| JWT | Defer until service boundary | Useful for service-to-service and CLI-adjacent APIs, not a session replacement. |
| Admin | Add after policy design | Useful for global user administration, bans, session revocation, and audited impersonation. |
| API Key | Keep and consolidate | Already uses Better Auth API Key plugin; still needed for public API and non-interactive automation. |
| Device Authorization | Keep and make primary for CLI | Already configured; should become the normal browser-assisted CLI login path. |
| Organization | Keep and consolidate | Already configured; use it for org membership/invite primitives while preserving PentaVault project policy. |
| Passkey | Add | High-value account security upgrade. |
| Two-Factor | Keep and consolidate | Already configured; reduce custom MFA code around plugin APIs over time. |

## Recommended Sequence

### Phase 0 - Schema and capability audit

- Generate a Better Auth schema diff in a scratch branch for adding
  `lastLoginMethod`, `captcha`, `jwt`, `admin`, and `passkey`.
- Record every new table, field, index, and route before migration.
- Add feature flags for high-impact plugins:
  - `AUTH_CAPTCHA_ENABLED`
  - `AUTH_PASSKEY_ENABLED`
  - `AUTH_ADMIN_PLUGIN_ENABLED`
  - `AUTH_JWT_PLUGIN_ENABLED`
- Keep all new provider secrets out of the repo and only document env names in
  `.env.example`.

### Phase 1 - Last Login Method

Add `lastLoginMethod()` to the backend and `lastLoginMethodClient()` to a
frontend Better Auth client module.

Recommended first pass:

- Use cookie storage only. The docs note database persistence adds a
  `lastLoginMethod` field to the user table; defer that until analytics need it.
- Show a small "Last used" hint on email, future GitHub, and future Google
  sign-in options.
- Keep the cookie lifetime near the Better Auth default of 30 days.
- For future providers, treat the GitHub login method as `github` and Google
  login as `google`. Gmail is a Google OAuth identity surface, not a separate
  Better Auth provider.

Tests:

- Frontend login form renders the last-used hint for email.
- Future social buttons display the correct hint without blocking sign-in.

### Phase 2 - Conditional Captcha

Better Auth's Captcha plugin protects configured endpoints by requiring an
`x-captcha-response` header. Its default endpoints are sign-up, email sign-in,
and password reset. That means a naive install makes captcha mandatory for
every request to those endpoints.

PentaVault should use Cloudflare Turnstile first because it supports low-friction
managed challenges and works well with suspicious-traffic handling.

Desired user experience:

- Normal users do not see a visible challenge.
- Suspicious users or noisy IP/email pairs receive a challenge before sign-in,
  sign-up completion, password reset, and OTP resend.
- API responses use a stable `CAPTCHA_REQUIRED` error with provider and site key
  metadata, never the secret key.

Risk signals:

- IP request rate on auth endpoints.
- Email plus IP failure count.
- OTP send attempts and verification failures.
- Password reset request burst.
- User-agent absence or obvious automation.
- Known trusted session attempting a sensitive change from an unusual IP.

Implementation approach:

- Add a small backend risk gate in front of PentaVault auth routes.
- Only render the Turnstile widget when the risk gate returns
  `CAPTCHA_REQUIRED`.
- Forward the Turnstile token as `x-captcha-response` when retrying a protected
  Better Auth action.
- Do not protect admin/session routes with captcha instead of authorization.
  Captcha is bot friction, not an access-control primitive.

Open design item:

- If Better Auth Captcha remains all-or-nothing for a configured endpoint, use a
  managed or invisible Turnstile mode so most legitimate users never see a
  challenge. If stricter conditional behavior is needed, keep the risk gate in
  PentaVault and use the provider verification only on challenged requests.

Tests:

- Below-threshold sign-in does not require captcha.
- Above-threshold sign-in returns `CAPTCHA_REQUIRED`.
- Missing or invalid captcha on challenged retry fails.
- Valid captcha on challenged retry proceeds.
- Provider outage fails closed for challenged requests.

### Phase 3 - Passkeys

Install and configure `@better-auth/passkey`.

Recommended policy:

- Passkey registration requires an authenticated, email-verified session.
- Registering the first passkey requires current password or existing 2FA when
  available.
- Passkey sign-in is allowed for verified accounts.
- Passkey management belongs in account security settings beside sessions and
  2FA.
- Keep recovery routes available; passkeys reduce password risk but do not
  remove account recovery requirements.

Implementation tasks:

- Add `passkey()` to Better Auth and `passkeyClient()` to the frontend auth
  client.
- Add schema migration for passkey tables.
- Configure RP name as `PentaVault` and production RP ID from the app domain.
- Add UI for add/list/rename/delete passkeys.
- Add passkey sign-in button and conditional UI support if stable in target
  browsers.

Tests:

- Backend schema includes passkey tables.
- Passkey management routes require session cookies.
- Frontend hides passkey actions when disabled by feature flag.

### Phase 4 - Two-Factor Consolidation

The backend already uses Better Auth `twoFactor()`. The remaining work is to
reduce custom MFA logic where Better Auth already provides the behavior.

Keep custom PentaVault wrappers only when they add product-specific value:

- Audit events.
- Security notification emails.
- Error-code normalization.
- MFA rotation guardrails.
- API-key-backed management request rejection.

Candidate simplifications:

- Route setup, verification, backup-code generation, and trusted-device flows
  through Better Auth plugin methods consistently.
- Avoid hand-rolled TOTP or backup-code verification when plugin methods can do
  it.
- Preserve the existing 30-day trusted-device behavior unless product policy
  changes.

Tests:

- Enable 2FA, verify TOTP, sign in with 2FA, trust device, generate backup
  codes, use backup code, disable 2FA.
- Account deletion and password change still require MFA when enabled.

### Phase 5 - Device Authorization for CLI

The backend already configures `deviceAuthorization()` with allowed client IDs,
expiry, polling interval, and the `/device` verification URI.

Make this the default CLI login path:

- `pv login` requests a device code.
- The CLI opens the browser to the verification URI when possible.
- The web app requires an authenticated session before approve/deny.
- The CLI polls according to the returned interval and handles
  `authorization_pending`, `slow_down`, `expired_token`, and `access_denied`.
- Store the resulting credential only in the OS credential store.

Keep API keys as fallback for non-interactive automation and CI, not as the
normal human login path.

Tests:

- Device code creation rejects unknown client IDs.
- Approve requires browser session.
- Deny works and is audited.
- Polling too fast receives the expected error.
- Expired device code cannot be approved.

### Phase 6 - Organization Plugin Consolidation

The Organization plugin is already in use with custom access-control statements
and roles in `organization-permissions.ts`.

Use Better Auth Organization for:

- Organization creation.
- Membership.
- Invitations.
- Active organization context.
- Organization role permission primitives.

Keep PentaVault custom policy for:

- Project role resolution.
- Secret visibility and read decisions.
- Proxy token issuance.
- Audit metadata reads.
- Access-request workflow.
- Self-leave and default organization deletion rules.

Near-term cleanup:

- Map frontend organization member and invite UX to plugin-backed API methods
  where possible.
- Keep legacy `readonly` normalized to `auditor`.
- Do not add new project roles as part of organization plugin work.

### Phase 7 - API Key Plugin Consolidation

The Better Auth API Key plugin is already installed and configured.

Use it for:

- User-created API keys.
- Future organization-owned API keys.
- CLI fallback.
- Public API access where session cookies do not fit.

Do not use API keys for:

- Admin dashboard actions.
- Browser session replacement.
- Organization/project authorization bypass.

Recommended improvements:

- Expose plugin-backed key list/revoke/metadata update flows in the dashboard.
- Add organization-owned keys only after service identities are designed.
- Keep per-key expiration, prefix, metadata, and rate limits.
- Ensure API key requests still resolve capabilities through backend policy.

### Phase 8 - Admin Plugin

Add Better Auth Admin for global platform administration, not ordinary
organization administration.

Use it for:

- User search/listing.
- User creation when needed for support.
- Ban and unban.
- Session revocation.
- Password reset support actions where product policy allows.
- Impersonation only with strict audit and support guardrails.

Do not use it as a replacement for:

- Organization owner/admin roles.
- Project RBAC.
- Secret access policy.
- API keys.

Schema impact:

- `user.role`
- `user.banned`
- `user.banReason`
- `user.banExpires`
- `session.impersonatedBy`

Security requirements:

- Global admin role must be separate from organization roles.
- Admin routes must reject API-key-authenticated requests.
- Impersonation must be time-limited, visible in audit logs, and easy to stop.
- Never allow impersonation into actions that reveal display-once secrets,
  recovery codes, API keys, or raw proxy tokens.
- Add a production bootstrap process for the first admin user.

Tests:

- Non-admin cannot call admin endpoints.
- Organization admin cannot call global admin endpoints.
- Admin can ban/unban and revoke sessions.
- Banned user cannot sign in.
- Impersonation is audited and blocked from sensitive reveal routes.

### Phase 9 - JWT Plugin

Defer JWT until there is a clear service boundary that needs independently
verifiable tokens.

Good uses:

- Internal services that cannot read Better Auth cookies.
- Future gateway or worker processes that need short-lived user context.
- Public API integrations that verify against JWKS.

Bad uses:

- Replacing browser sessions.
- Long-lived CLI auth storage.
- Bypassing backend policy checks.

Recommended configuration:

- Add `jwt()` only behind `AUTH_JWT_PLUGIN_ENABLED`.
- Use short token lifetimes.
- Validate issuer and audience everywhere.
- Cache JWKS, but refetch when token `kid` changes.
- Document `/api/auth/token` and `/api/auth/jwks` exposure before enabling in
  production.

Tests:

- Token endpoint requires a valid session or accepted bearer path.
- JWKS endpoint exposes only public key material.
- Downstream verification rejects wrong issuer, wrong audience, expired token,
  and unknown `kid`.

## Social Login Follow-Up

Last Login Method becomes most valuable when social auth exists.

Future provider plan:

- Add GitHub OAuth for developer-friendly sign-in.
- Add Google OAuth for users who think of this as Gmail sign-in.
- Keep email/password available.
- Make account linking explicit and audited.
- Normalize the login-method values shown in UI to `email`, `github`, and
  `google`.

## Migration Guardrails

- Do not remove custom PentaVault routes just because a plugin exists. First map
  the plugin behavior, preserve existing API contracts, then remove redundant
  code in small steps.
- Every sensitive backend route must continue to enforce authorization on the
  backend.
- Regenerate Better Auth schema and inspect generated Drizzle changes before
  running migrations.
- Add rollback notes for every auth-schema migration.
- Keep all provider secrets in environment variables.
- Run backend `pnpm run lint`, `pnpm run typecheck`, and `pnpm test` after
  backend implementation changes.
- Run frontend `pnpm run lint`, `pnpm run type-check`, and `pnpm test` after
  frontend implementation changes.

## Near-Term Recommendation

Implement in this order:

1. Last Login Method, cookie-only.
2. Captcha risk-gate design and provider env wiring.
3. Two-factor consolidation tests around the existing plugin.
4. Device authorization CLI flow hardening.
5. Passkey support.
6. Organization and API key consolidation.
7. Admin plugin with audited impersonation.
8. JWT only when a downstream service needs JWKS verification.

