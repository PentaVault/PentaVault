# PentaVault TODO

Current open work only. Completed review items and manually verified flows have been removed from this list.

Last updated: May 1, 2026 2:29 PM +05:30.

## Database Rollout

- [ ] Apply and verify the `readonly` to `auditor` auth migration in staging and production databases.
- [ ] Apply and verify the access-request role migration in staging and production databases.

## Security Architecture

- [ ] Define the final secret naming rules and conflict behavior as product policy.
- [ ] Define per-user/per-role secret access rules and implement UI plus backend enforcement once approved.
- [ ] Document user-level, variable-level, and key-level isolation boundaries.
- [ ] Add tests for cross-user, cross-organization, cross-project, secret, and token access denial.
- [ ] Expand the centralized backend policy layer beyond project access to cover organization, project, secret, token, audit, and access-request capabilities.
- [ ] Make route handlers and stores call capability checks rather than manually repeating role logic.
- [ ] Add policy-module tests as the source of truth for the broader access layer.

## Documentation And Cleanup

- [ ] Audit current Markdown files and decide which docs are active, archival, duplicated, or obsolete.
- [ ] Remove or consolidate stale Markdown docs after review.
