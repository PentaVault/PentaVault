# PentaVault TODO

Current open work only. Completed review items and manually verified flows have been removed from this list.

Last updated: July 10, 2026.

## Database Rollout

These items require staging/production database access and are not local code
changes.

- [ ] Apply and verify the `readonly` to `auditor` auth migration in staging and production databases.
- [ ] Apply and verify the access-request role migration in staging and production databases.

## Security Architecture

- [ ] Review `docs/completed/better-auth-plugin-roadmap.md` before adding new
  auth work, especially social login, passkey rollout, admin/JWT enablement, and
  production captcha secrets.
- [ ] Define the final secret naming rules and conflict behavior as product policy.
- [ ] Continue expanding policy-module coverage for future organization, token, audit, and access-request capabilities outside the completed core secrets engine roadmap.

## CLI Cache Gate

- [ ] Define backend-issued cache leases, revision checks, and offline expiry before implementing encrypted local secret caching. The CLI intentionally remains online-only until revocation cannot be bypassed.
