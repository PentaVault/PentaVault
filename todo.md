# PentaVault TODO

Current open work only. Completed review items and manually verified flows have been removed from this list.

Last updated: May 7, 2026 12:00 PM +05:30.

## Database Rollout

- [ ] Apply and verify the `readonly` to `auditor` auth migration in staging and production databases.
- [ ] Apply and verify the access-request role migration in staging and production databases.

## Security Architecture

- [ ] Execute the Better Auth plugin roadmap in
  `docs/planning/better-auth-plugin-roadmap.md`, starting with last-login-method,
  conditional captcha design, and passkey planning.
- [ ] Define the final secret naming rules and conflict behavior as product policy.
- [ ] Continue expanding policy-module coverage for future organization, token, audit, and access-request capabilities outside the completed core secrets engine roadmap.
