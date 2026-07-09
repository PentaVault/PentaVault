# Better Auth Plugin Roadmap

Date: 2026-05-07
Status: completed

## Goal

Use Better Auth plugins where they fit PentaVault while keeping backend policy,
audit, encryption, project access, and secret/token authorization as the source
of truth. Stripe remains out of scope until billing is actively designed.

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
- Context7 MCP was queried for `/better-auth/better-auth` plugin setup and
  schema expectations before the implementation pass.

## Completed Ledger

- [x] Created this roadmap as the live task ledger.
  - Done: Converted the planning draft into a resumable checklist with notes.
  - Verified: Roadmap now records done/how verified/remaining context.
  - Remaining: Keep this file current before and after future auth slices.

- [x] Reconciled Last Login Method.
  - Done: Confirmed backend `lastLoginMethod({ storeInDatabase: false })` and
    frontend last-used email hint already exist from the earlier commit.
  - Verified: Existing login form test covers the email "last used" hint.
  - Remaining: Add GitHub and Google buttons later, using method values
    `github` and `google`.

- [x] Added backend feature flags and environment docs.
  - Done: Added captcha, passkey, admin, JWT flags to backend env parsing and
    `.env.example`.
  - Verified: Backend env unit tests cover defaults, enabled flags, admin user
    ID parsing, passkey RP ID derivation, and production captcha key guardrails.
  - Remaining: Provide real Cloudflare Turnstile keys only through deployment
    secrets.

- [x] Added auth capabilities discovery.
  - Done: Added `GET /api/v1/auth/capabilities` with no-store headers and no
    secret/admin-ID leakage.
  - Verified: Backend integration test asserts enabled capability output and
    confirms the captcha secret is not present in the response body.
  - Remaining: Keep frontend gating UX-only; backend routes remain authoritative.

- [x] Added Better Auth plugin foundations behind flags.
  - Done: Added captcha, passkey, admin, and JWT plugins behind backend flags.
    Captcha uses Cloudflare Turnstile, passkey requires an authenticated session
    for registration, admin is disabled by default, and JWT is disabled by
    default with short-lived token config.
  - Verified: Backend type-check passed after plugin wiring.
  - Remaining: Do not enable admin/JWT in production until support/audit policy
    is finalized.

- [x] Added auth schema and migration changes.
  - Done: Added admin user/session fields, `passkey`, and `jwks` schema entries
    plus auth migration `0006_better_auth_plugin_foundations.sql`.
  - Verified: Ran Better Auth schema generation into a scratch file with
    passkey/admin/JWT flags enabled and compared generated additions against the
    curated schema before removing the scratch output.
  - Remaining: Apply migrations in a real database environment before enabling
    passkeys/JWT.

- [x] Added frontend Better Auth client module.
  - Done: Added `src/lib/auth/better-auth-client.ts` using `/api/auth` through
    the existing Next proxy and `passkeyClient()`.
  - Verified: Frontend type-check passed.
  - Remaining: Add social client plugins when GitHub/Google OAuth is designed.

- [x] Added passkey sign-in and account-security management UI.
  - Done: Added capability-gated passkey sign-in on the login form and a
    capability-gated account settings card for add/list/delete passkeys.
  - Verified: Frontend type-check passed and login form test covers passkey
    sign-in visibility/action when enabled.
  - Remaining: Add rename UX once product copy is settled; backend endpoint
    support is already exposed in the API client.

- [x] Added captcha token forwarding and managed Turnstile UI.
  - Done: Added a Turnstile widget component, capabilities-gated rendering, and
    `x-captcha-response` forwarding for email sign-in, registration start,
    registration resend, password reset request, and password reset completion.
  - Verified: Frontend type-check passed.
  - Remaining: Build a true conditional risk gate if product wants captcha only
    after suspicious traffic instead of managed Turnstile on enabled endpoints.

- [x] Kept 2FA, device authorization, organization, and API-key flows on
  Better Auth backed paths with PentaVault policy wrappers.
  - Done: No replacement of PentaVault authorization wrappers; admin/JWT/API key
    remain separate surfaces.
  - Verified: Existing backend tests still cover MFA, device, organization, and
    API-key paths during the required test run.
  - Remaining: Add CLI-side device login implementation when CLI work resumes.

- [x] Fixed the frontend Biome formatting blocker.
  - Done: Ran Biome write over the touched auth files and
    `src/components/secrets/__tests__/secrets-list.test.tsx`.
  - Verified: Formatting completed without remaining formatter errors.
  - Remaining: None.

## Plugin Decisions

| Plugin | Current Decision | Notes |
| --- | --- | --- |
| Stripe | Deferred | Payments/subscriptions remain future billing work. |
| Last Login Method | Enabled | Cookie-only, no database field. |
| Captcha | Flagged foundation | Cloudflare Turnstile managed mode; disabled by default. |
| JWT | Flagged foundation | Disabled by default until a downstream service needs JWKS verification. |
| Admin | Flagged foundation | Global platform admin only; not org/project RBAC. |
| API Key | Keep and consolidate | Better Auth API Key plugin remains the API/automation surface. |
| Device Authorization | Keep | Browser-assisted CLI login remains the preferred human CLI path. |
| Organization | Keep and consolidate | Better Auth org primitives plus PentaVault project policy. |
| Passkey | Flagged implementation | UI and schema are ready; enable after migration and RP config. |
| Two-Factor | Keep and consolidate | Better Auth two-factor plugin remains in use. |

## Post-Completion Follow-Up

Enablement order should be: migrate schema, set passkey RP ID for the deployed
frontend origin, enable passkeys for a small test group, then enable Turnstile
with real Cloudflare keys. Admin and JWT should stay disabled until platform
admin audit policy and downstream JWT audience/issuer validation are specified.

Captcha is currently implemented as a managed-provider foundation because the
Better Auth Captcha plugin protects configured endpoints whenever enabled. If
PentaVault needs "only suspicious users see captcha" behavior, add a backend
risk gate that challenges only noisy IP/email pairs and verify the Turnstile
token on those challenged retries.

The backend access-policy module remains authoritative for projects, secrets,
proxy tokens, audit metadata, and organization/project membership decisions.
Frontend capability checks are UX only.
