# PentaVault TODO

Detailed status record extracted from `docs/review/2026-04-29.md` and compared against the current frontend and backend code on April 29, 2026.

## Status Legend

- `[x]` complete in the current codebase
- `[~]` partially complete or implemented differently from the review expectation
- `[ ]` still open
- `[?]` needs manual verification in a real browser/email/session environment
- `[-]` intentionally deferred design/product decision

## Current State Summary

Not everything from the April 29 review is done, but the highest-impact implementation gaps identified in the previous review pass have been reduced.

The core account, MFA, organization, project, secrets, project-team, and auditor metadata flows are mostly implemented. This pass added a shared project access-policy module in the backend, moved duplicated project RBAC decisions into that module, aligned project access-request roles with the `member` project role, added self-leave behavior for projects and organizations, fixed the account settings password-code cooldown, made password-change session behavior consistent, enabled project deletion from project settings, and tightened the organization project-visibility dependency between "Members can see all projects" and access requests.

The main remaining gaps are reproduction-only invite/default-organization bugs, final secret/user/key isolation design, broader DAL-style backend access architecture beyond the project policy module, project access-request database enum migration, and manual browser/email verification.

## Completed Or Mostly Working From Review

### R-001 Sign-in and generic credential errors

Status: [x]
Area: auth
Review source: Sign-in works, invalid credentials do not reveal whether email or password is wrong.
Current state: Backend maps invalid login to a generic email/password error, and frontend auth forms surface safe user-facing messages.
Evidence:

- `PentaVault-Backend/apps/api/src/plugins/auth.ts`
- `src/components/auth/login-form.tsx`

### R-002 Forgot-password account enumeration protection

Status: [x]
Area: auth
Review source: Unknown accounts can request password reset without revealing account existence.
Current state: Password reset request flow is implemented through the auth API and keeps safe messaging behavior.
Evidence:

- `src/components/auth/forgot-password-form.tsx`
- `PentaVault-Backend/apps/api/src/plugins/auth.ts`

### R-003 Registration OTP/backoff and incomplete registration behavior

Status: [x]
Area: auth
Review source: Verification email backoff works, emails arrive, incomplete registration does not create database entries.
Current state: Registration flow has OTP handling, resend cooldown/backoff behavior, pending registration handling, and no evidence of permanent account creation before OTP completion.
Evidence:

- `src/components/auth/register-form.tsx`
- `PentaVault-Backend/apps/api/src/plugins/auth.ts`
- `PentaVault-Backend/packages/auth/src/service.ts`

### R-004 Default organization after normal registration

Status: [?]
Area: auth / organizations
Review source: First account creation created the default personal organization correctly, but one later recreated account did not.
Current state: Backend has default organization assignment and fallback logic, but the intermittent failure described in the review needs a focused reproduction test because it may depend on deletion/recreate timing or auth-provider side effects.
Evidence:

- `PentaVault-Backend/packages/auth/src/service.ts`

### R-005 Account name update

Status: [x]
Area: account settings
Review source: Updating the full name works.
Current state: Account settings calls the auth API and refreshes auth state after a successful update.
Evidence:

- `src/app/(dashboard)/settings/account/page.tsx`

### R-006 MFA setup, MFA login, recovery-code login, MFA change, and MFA disable

Status: [x]
Area: auth / MFA
Review source: MFA setup, wrong-code handling, current-MFA change, recovery-code rotation, MFA login, remember-device, password change with MFA, and disabling MFA mostly worked.
Current state: MFA settings and login flows are implemented, including TOTP, recovery-code sign-in, MFA rotation, and recovery-code replacement after recovery login.
Evidence:

- `src/components/settings/mfa-settings-card.tsx`
- `src/components/auth/login-form.tsx`
- `PentaVault-Backend/apps/api/src/plugins/auth.ts`
- `PentaVault-Backend/packages/auth/src/service.ts`

### R-007 Account deletion

Status: [x]
Area: account settings
Review source: Account deletion worked and removed related data.
Current state: Account settings exposes permanent deletion with confirmation and MFA support when enabled.
Evidence:

- `src/app/(dashboard)/settings/account/page.tsx`

### R-008 Project creation, duplicate names, slug behavior, rename behavior, archive, restore, delete, organization isolation, and search

Status: [x]
Area: projects
Review source: Project list, creation, duplicate-name slug generation, rename without slug mutation, archive/restore/delete, organization switching, and search worked.
Current state: Project list and action menu support these flows, and backend project service includes organization-aware listing and slug handling.
Evidence:

- `src/app/(dashboard)/projects/page.tsx`
- `src/components/dashboard/project-actions-menu.tsx`
- `PentaVault-Backend/apps/api/src/plugins/projects.ts`
- `PentaVault-Backend/packages/projects/src/service.ts`

### R-009 Project overview empty state and secrets import/update behavior

Status: [x]
Area: secrets
Review source: Empty projects point users to the Secrets tab, adding/importing secrets works, and duplicate names update existing secrets.
Current state: Secrets and overview surfaces are implemented with empty states and mutation flows.
Evidence:

- `src/app/(dashboard)/projects/[projectId]/page.tsx`
- `src/components/secrets/secrets-list.tsx`

### R-010 Organization name update

Status: [x]
Area: organization settings
Review source: Organization rename worked flawlessly.
Current state: Organization settings calls the organization update API and refreshes auth state.
Evidence:

- `src/app/(dashboard)/settings/organization/page.tsx`
- `PentaVault-Backend/apps/api/src/plugins/auth.ts`

### R-011 Project team current-user ordering and `you` badge

Status: [x]
Area: project team
Review source: Current user should appear at the top of the project members list with a `you` badge.
Current state: Implemented. Team page sorts the current user first and passes `currentUserId`; member rows render the `you` badge.
Evidence:

- `src/app/(dashboard)/projects/[projectId]/team/page.tsx`
- `src/components/dashboard/team-member-row.tsx`

### R-012 Project role options limited to admin/member

Status: [x]
Area: project team
Review source: Project Add Member should not show developer or read-only because project roles should only be `admin` and `member`.
Current state: Implemented in the project team add form and backend project member schemas.
Evidence:

- `src/components/dashboard/team-member-add-form.tsx`
- `PentaVault-Backend/apps/api/src/plugins/projects.ts`

### R-013 Admin cannot change own project role

Status: [x]
Area: project team / authorization
Review source: Admins may promote/demote others but must not demote themselves.
Current state: Implemented in both UI and backend service. The current user's row is not editable, and backend rejects self project-role mutation.
Evidence:

- `src/components/dashboard/team-member-row.tsx`
- `PentaVault-Backend/packages/projects/src/service.ts`

### R-014 Members can view project team members and roles

Status: [x]
Area: project team
Review source: Members should be able to see all team members and their roles.
Current state: Team page allows users with project access to load members; auditors can also read member metadata.
Evidence:

- `src/app/(dashboard)/projects/[projectId]/team/page.tsx`
- `PentaVault-Backend/apps/api/src/plugins/projects.ts`

### R-015 Auditor metadata access while secrets/tokens stay blocked

Status: [x]
Area: RBAC / auditor
Review source: Auditor/read-only behavior needed work.
Current state: Auditor organization role can read project metadata, audit data, and member metadata. Secrets and tokens remain unavailable through the frontend gating.
Evidence:

- `src/app/(dashboard)/projects/[projectId]/page.tsx`
- `src/app/(dashboard)/projects/[projectId]/audit/page.tsx`
- `src/app/(dashboard)/projects/[projectId]/team/page.tsx`
- `PentaVault-Backend/apps/api/src/plugins/projects.ts`

### R-016 Implementation tracker cleanup

Status: [x]
Area: docs
Review source: Finish `implementation.md` items, then delete `implementation.md`.
Current state: `implementation.md` has been deleted and committed.
Evidence:

- Frontend commit `3f2d5e3 feat(projects): refine team access UI`

## Open Bugs And Required Fixes

### R-101 Reject password change when current and new password are identical

Status: [~]
Priority: high
Area: account settings / auth
Review source: If the current password and new password are the same, the user should receive an error. This should apply to current-password, OTP-based, and MFA-based password changes.
Current state: Current-password changes now reject identical current and new password values in both the account settings frontend and the backend auth API. OTP-based resets still cannot reliably compare against the current password unless the backend performs credential-history or hash-verification logic for that reset path.
Needed:

- Decide whether OTP-based reset should include credential-history enforcement so password reuse can also be rejected without needing the current password.
- Add regression coverage for the current-password same-password rejection.
Evidence:

- `src/app/(dashboard)/settings/account/page.tsx`
- `PentaVault-Backend/apps/api/src/plugins/auth.ts`

### R-102 Password change session/logout behavior is delayed and inconsistent

Status: [x]
Priority: high
Area: account settings / auth
Review source: After changing password with current password, logout only becomes apparent after reload/navigation. OTP-based password change does not behave the same way, even though re-login is still required.
Current state: Account settings now signs out, refreshes auth state, and redirects to the login page after successful password changes for both current-password and email-code flows.
Needed:

- Manually verify the redirect in a browser for current-password, email-code, and MFA-enabled account states.
Evidence:

- `src/app/(dashboard)/settings/account/page.tsx`

### R-103 Account settings email-code resend should show a 60-second timer

Status: [x]
Priority: high
Area: account settings / auth UX
Review source: After sending a password email code from account settings, the "Send again" button appears immediately. It should show a 60-second timer before retry is allowed.
Current state: The account settings password-code sender now uses the shared email cooldown behavior, disables resend during cooldown, shows a countdown, and respects backend `retryAfter` values when rate-limited.
Needed:

- Manually verify the countdown and rate-limit retry-after behavior against the running backend.
Evidence:

- `src/app/(dashboard)/settings/account/page.tsx`
- `src/components/auth/forgot-password-form.tsx`
- `src/components/auth/register-form.tsx`

### R-104 Used/expired MFA recovery code should show a visible notification

Status: [~]
Priority: medium
Area: MFA
Review source: Reusing a recovery code correctly fails, but no toaster was shown. The UI should notify the user, for example with "Invalid code."
Current state: Login and settings flows show field-level errors for invalid recovery codes. The review specifically asks for a top-level toaster notification, which is not consistently present for this recovery-code case.
Needed:

- Decide whether field-level error is enough or whether a toast is required.
- If toast is required, add it consistently to login recovery-code and settings MFA-change recovery-code failures.
Evidence:

- `src/components/auth/login-form.tsx`
- `src/components/settings/mfa-settings-card.tsx`
- `PentaVault-Backend/apps/api/src/plugins/auth.ts`

### R-105 Intermittent missing default personal organization after account recreation

Status: [?]
Priority: high
Area: organizations / auth
Review source: A recreated account once did not receive a default personal organization.
Current state: Backend has default organization fallback and assignment logic, but this exact delete/recreate path still needs reproduction and test coverage.
Needed:

- Add or run an integration test for delete account -> recreate same email -> default organization exists.
- Verify default organization and active organization are both set after registration and after invitation-driven registration.
- Confirm deleted-user cleanup cannot leave stale identifiers that block personal organization creation.
Evidence:

- `PentaVault-Backend/packages/auth/src/service.ts`

### R-106 Invitation acceptance via email URL can show joined without access

Status: [?]
Priority: high
Area: invitations / organizations
Review source: Accepting an invite through an email URL showed "joined", but the organization was not visible or accessible afterward.
Current state: Frontend now attempts to set the accepted organization active after invite acceptance and falls back to `auth.refresh()`. Backend has token and by-id invitation accept endpoints. This still needs manual verification with real email links and multiple users.
Needed:

- Test invitation acceptance from dashboard notification and email URL.
- Verify membership appears in `/api/v1/auth/organizations` immediately after acceptance.
- Verify active organization is set or selectable after acceptance.
- Add regression coverage if the email-link path still fails.
Evidence:

- `src/components/invitations/invitation-dialog.tsx`
- `src/app/(auth)/invitations/[token]/page.tsx`
- `PentaVault-Backend/apps/api/src/plugins/auth.ts`
- `PentaVault-Backend/packages/auth/src/service.ts`

### R-107 Invitation emails not reliably sending for read-only/admin roles

Status: [?]
Priority: high
Area: invitations / email
Review source: Emails were not sending properly for read-only and admin role invitations.
Current state: Invitation send endpoints and frontend invite form exist. The organization invite UI now offers the canonical roles owner, admin, member, and auditor, with read-only removed as a separate role. Actual SMTP/email delivery still must be verified in the configured environment.
Needed:

- Send test invites for owner/admin/member/auditor roles in the real SMTP environment.
- Confirm SMTP logs and delivery outcomes.
- Confirm legacy read-only does not remain reachable through the current invite UI.
Evidence:

- `src/app/(dashboard)/settings/organization/members/page.tsx`
- `PentaVault-Backend/apps/api/src/plugins/auth.ts`
- `PentaVault-Backend/packages/email/src/smtp.ts`

### R-108 Organization role model cleanup: merge/remove read-only and auditor

Status: [x]
Priority: high
Area: RBAC / product design
Review source: Remove the separate Auditor role and merge it into read-only, or rename read-only to Auditor.
Current state: Implemented with `auditor` as the canonical merged role. The frontend and backend organization role models no longer expose `readonly` as a normal role. A database migration converts existing organization member and invitation `readonly` values to `auditor`, and API/UI boundary logic treats old `readonly` values as a legacy alias only.
Needed:

- Apply and verify the new auth migration in local/staging databases.
- Keep legacy `readonly` handling only as compatibility code until old data is gone everywhere.
Evidence:

- `PentaVault-Backend/apps/api/src/plugins/auth.ts`
- `PentaVault-Backend/packages/auth/src/organization-permissions.ts`
- `PentaVault-Backend/packages/db/migrations/auth/0003_merge_readonly_auditor.sql`
- `src/app/(dashboard)/settings/organization/members/page.tsx`

### R-109 Project access requests still use developer/readonly roles

Status: [x]
Priority: high
Area: project access / RBAC
Review source: Project-specific roles should be only `admin` and `member`.
Current state: Project access-request creation/review now normalizes requested and granted roles to `member`. The backend still serializes the value to the legacy database enum internally for compatibility, but the API and frontend model now expose `member`.
Needed:

- Plan a database enum migration so the internal stored access-request role can also become `member` instead of the legacy `developer` value.
Evidence:

- `src/app/(dashboard)/projects/page.tsx`
- `PentaVault-Backend/apps/api/src/plugins/projects.ts`

### R-110 Add ability to leave a project

Status: [x]
Priority: medium
Area: project team
Review source: Users should be able to leave a project themselves. Admins should be able to choose whether they are part of a project team even though they can access all projects.
Current state: Implemented. Project members can now leave their own explicit project membership. The backend blocks unsafe owner/root access removal and still prevents non-managers from removing other users.
Needed:

- Add focused backend/frontend tests for self-leave, org-owner immutability, and admin explicit membership behavior.
Evidence:

- `src/components/dashboard/team-member-row.tsx`
- `PentaVault-Backend/packages/projects/src/service.ts`

### R-111 Add ability to leave an organization

Status: [x]
Priority: medium
Area: organization settings / members
Review source: Users should be able to leave an organization themselves.
Current state: Implemented. Users can initiate self-removal from organization members, and the backend allows self-leave while blocking the last owner from leaving.
Needed:

- Manually verify active-organization fallback after a user leaves an organization.
Evidence:

- `src/app/(dashboard)/settings/organization/members/page.tsx`
- `PentaVault-Backend/apps/api/src/plugins/auth.ts`
- `PentaVault-Backend/packages/auth/src/service.ts`

### R-112 Project settings Delete Project option disabled

Status: [x]
Priority: medium
Area: project settings
Review source: Delete Project is disabled in project settings for an unclear reason.
Current state: Implemented. Project settings now exposes project deletion behind a confirmation dialog that requires typing the project name, then redirects back to the projects page after success.
Needed:

- Manually verify the delete flow from project settings in a browser.
Evidence:

- `src/app/(dashboard)/projects/[projectId]/settings/page.tsx`
- `src/components/dashboard/project-actions-menu.tsx`

### R-113 Organization access-control options should be redesigned

Status: [x]
Priority: high
Area: organization access control
Review source: "Members can request project access" should be tied to "Members can see all projects" because request access makes no sense when projects are hidden.
Current state: Implemented as a dependent setting. When "Members can see all projects" is turned off, the frontend disables access requests and the backend persists `membersCanRequestProjectAccess=false` even if a client attempts to send it as true.
Needed:

- Manually verify the settings behavior in a browser.
Evidence:

- `src/app/(dashboard)/settings/organization/access/page.tsx`
- `PentaVault-Backend/packages/projects/src/store.ts`

### R-114 Members can see all projects toggle bug

Status: [~]
Priority: high
Area: organization access control / project visibility
Review source: Turning off "Members can see all projects" still left projects visible to a member.
Current state: The duplicated visibility decision has been moved into the shared project access-policy module, and `membersCanSeeAllProjects=false` now prevents private project discoverability from making projects visible to ordinary members. Manual browser verification is still needed for the exact user flow from the review.
Needed:

- Manually test member visibility with `membersCanSeeAllProjects=false`.
- Add a regression test for hidden projects.
Evidence:

- `PentaVault-Backend/packages/projects/src/store.ts`
- `PentaVault-Backend/packages/projects/src/service.ts`

### R-115 Secret naming and per-user secret access model is undefined

Status: [-]
Priority: high
Area: secrets / product design
Review source: More functionality is needed for how secrets are named, how a user has access to each secret, and how the flow should work.
Current state: Basic secret create/import/list/update exists, but a complete per-secret user access model is not fully defined in the review or implemented as a final product concept.
Needed:

- Define secret naming rules and conflict behavior as product policy.
- Define per-user/per-role secret access rules.
- Implement UI and backend enforcement once the model is approved.
Evidence:

- `src/components/secrets/secrets-list.tsx`
- `PentaVault-Backend/apps/api/src/plugins/projects.ts`

### R-116 User-level, variable-level, and key-level isolation

Status: [~]
Priority: high
Area: security / RBAC
Review source: Add user-level isolation, user-level variable isolation, user-level key isolation, and proper role-based access control for the MVP.
Current state: There is meaningful project and organization isolation, token/secret pages are role-gated, and project visibility/access decisions now go through a shared backend policy module. The review's deeper variable/key/user isolation requirement is still not fully tracked as a completed architecture.
Needed:

- Document the exact isolation boundaries for users, variables/secrets, and keys/tokens.
- Add tests for cross-user, cross-org, cross-project, secret, and token access denial.
- Centralize enforcement enough that new routes inherit it by default.
Evidence:

- `PentaVault-Backend/apps/api/src/plugins/projects.ts`
- `PentaVault-Backend/apps/api/src/plugins/tokens.ts`
- `PentaVault-Backend/packages/projects/src/service.ts`

### R-117 Centralized DAL-style RBAC architecture

Status: [~]
Priority: high
Area: architecture / security
Review source: RBAC should live in a data access layer or single policy file so security controls are plug-and-play and reused everywhere.
Current state: A new shared project access-policy module now centralizes project role resolution, project management checks, project visibility, access-request role normalization, metadata/audit read checks, and project self-removal rules. Project service, project store, project API routes, and token routes now use this shared policy, and dedicated unit tests lock down the high-risk visibility/removal/normalization paths. This is an important step, but it is not yet the full DAL-style backend access architecture for organizations, secrets, tokens, audit, auth, and every future data access path.
Needed:

- Expand the policy layer from project access into a broader backend data-access/security layer covering organization, project, secret, token, audit, and access-request capabilities.
- Make route handlers and stores call capability checks rather than manually repeating role logic.
- Add policy-module tests as the source of truth.
Evidence:

- `PentaVault-Backend/packages/projects/src/access-policy.ts`
- `PentaVault-Backend/tests/unit/project-access-policy.test.ts`
- `PentaVault-Backend/packages/auth/src/authorization.ts`
- `PentaVault-Backend/packages/projects/src/service.ts`
- `PentaVault-Backend/apps/api/src/plugins/projects.ts`
- `PentaVault-Backend/apps/api/src/plugins/tokens.ts`

### R-118 Reduce excess Markdown files

Status: [~]
Priority: low
Area: docs
Review source: There are too many `.md` files and they should be reduced.
Current state: `implementation.md` has been deleted. Other markdown files still exist and have not been audited for consolidation.
Needed:

- List current markdown files.
- Decide which docs are active, archival, duplicated, or obsolete.
- Remove or consolidate stale docs after review.
Evidence:

- Repository documentation tree

### R-119 Align frontend and backend tooling

Status: [x]
Priority: medium
Area: tooling / cleanup
Review source: Frontend and backend used different test and lint stacks; frontend used Jest while backend used Vitest and Biome.
Current state: Frontend now uses Vitest with jsdom for tests and Biome for linting/formatting, matching the backend tooling direction. Jest, ts-jest, ESLint, Prettier, and related frontend-only packages/config files were removed.
Evidence:

- `package.json`
- `vitest.config.ts`
- `biome.json`
- `src/test/vitest.setup.ts`

## Verification Checklist For Next Pass

- [ ] Run a full browser test for password change with current password, email-code password change, and MFA-enabled password change.
- [ ] Add tests for same-password rejection in current-password change.
- [ ] Test account settings password-code resend timer and backend rate-limit retry-after behavior in a browser.
- [ ] Reproduce delete account -> recreate same email -> default personal organization.
- [ ] Send invitation emails for owner, admin, and member roles in the real SMTP environment.
- [ ] Accept organization invitations through both dashboard notification and email URL.
- [x] Verify hidden private-project policy with backend unit tests when organization visibility is disabled.
- [x] Add backend tests for project self-leave policy edge cases.
- [ ] Plan the database migration for legacy project access-request role storage.
- [ ] Design and document the final secret/user/key isolation model before coding deeper access rules.
- [ ] Expand the centralized backend access-policy layer beyond project-level access into the broader DAL-style architecture.
