# PentaVault TODO

Current open work only. Completed review items and manually verified flows have been removed from this list.

Last updated: July 9, 2026 3:15 PM +05:30.

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
