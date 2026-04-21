# PentaVault — Organizations Feature: Amendment
## Membership Tiers, Project Visibility, and Access Request Flow
## Add this to the existing organizations prompt before sending to the agent

This document amends `AGENT_ORGANIZATIONS_FEATURE.md`.
All previous instructions remain valid. Apply these additions on top.
Where this document contradicts the previous prompt, this one takes precedence.

---

## The Complete User Type Picture

You described three scenarios. After analysis, there are actually five distinct
user types that PentaVault needs to handle correctly. Here is the full set:

### Type 1 — Solo Developer (Personal)
- Creates account → personal org auto-created → only member
- Org name: `{fullName}'s Projects`, e.g. `Abhash's Projects`
- No invitation flow needed, no access management needed
- All projects visible and accessible to them by default
- Will likely never touch org settings

### Type 2 — Small Team (2–10 people)
- One person creates an org, invites teammates
- Everyone on the team works on all projects together
- Nobody wants to manage fine-grained access — they want simplicity
- All projects should be visible to all members by default (open)
- Simple roles: owner runs the org, others are developers
- Access request flow would be friction, not a feature, for this group

### Type 3 — Large Organisation (10+ people)
- Projects are sensitive and department-specific
- A frontend developer should not see backend DB credentials
- A new hire should not have access to production-related projects on day one
- Members need to request access to projects they need
- Owners/admins review and approve requests
- This is the enterprise buyer — the one paying the highest tier

### Type 4 — Contractor / Guest (you had not considered this)
- A freelancer, agency, or external vendor who needs temporary access
- Should NOT see the full member list of the org (confidentiality)
- Should NOT be able to create new projects
- Can only access the specific projects they have been explicitly added to
- Their membership has an expiry date — access auto-revokes when it expires
- Example: a contractor hired for 3 months to build one integration,
  needs access to STRIPE_KEY and OPENAI_KEY but nothing else

### Type 5 — Read-Only Auditor (you had not considered this)
- A compliance officer, security reviewer, or manager
- Needs to view audit logs and usage metrics across the org
- Must NOT be able to see secret values, copy tokens, or make any changes
- Must NOT be able to invite members or manage anything
- Has a distinct role that is separate from 'readonly' on a project —
  this is an org-level read-only role, not a project-level one
- Example: a CTO who wants to see who accessed what, or a compliance review

### Type 6 — Service Account / Bot (edge case, not a human)
This is already handled by the `api_keys` table in the existing backend.
A CI/CD system uses an API key scoped to a project. No changes needed.
Document this in the org settings page so users understand they don't need
to create a human user account for their GitHub Actions workflow.

---

## New Concept: Project Visibility

Add a `visibility` column to `projects` and a `default_project_visibility`
policy to `organizations`. This is the switch that separates Type 2 behaviour
(everyone sees everything) from Type 3 behaviour (need explicit access).

### Database changes

```sql
-- Add visibility to projects
ALTER TABLE projects
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('open', 'private'));

-- Add default project visibility policy to organizations
ALTER TABLE organizations
  ADD COLUMN default_project_visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (default_project_visibility IN ('open', 'private'));

-- Add member_type to organization_members to support guest accounts
ALTER TABLE organization_members
  ADD COLUMN member_type TEXT NOT NULL DEFAULT 'member'
    CHECK (member_type IN ('member', 'guest'));

-- Add expires_at to organization_members for contractor/guest access
ALTER TABLE organization_members
  ADD COLUMN expires_at TIMESTAMPTZ;
  -- NULL = never expires (standard members)
  -- Set to a future date for contractors/guests

-- Add org-level auditor role support
-- (The existing role CHECK constraint must be updated)
ALTER TABLE organization_members
  DROP CONSTRAINT organization_members_role_check;

ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_role_check
    CHECK (role IN ('owner', 'admin', 'developer', 'readonly', 'auditor'));
-- auditor: can view audit logs and usage metrics org-wide, cannot touch secrets or tokens
```

### What `visibility` means at runtime

```
Project visibility = 'open'
  → Any org member with role developer, admin, or owner
    automatically has access without being in project_members
  → Guest members still need explicit project_members entry

Project visibility = 'private'
  → Only members explicitly in project_members can access
  → Everyone else sees the project name in the list but cannot open it
  → They can send an access request
```

### What `default_project_visibility` means

When a new project is created inside an org, it inherits the org's
`default_project_visibility` setting. Owner/admin can override it per project.

Small teams set this to `open`. Large orgs set this to `private`.
The org setup wizard (during onboarding) asks this question.

---

## New Table: Access Requests

```sql
CREATE TABLE access_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requester_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_role    TEXT NOT NULL DEFAULT 'developer'
                      CHECK (requested_role IN ('developer', 'readonly')),
  -- Requesters can only ask for developer or readonly — they cannot request admin/owner
  message           TEXT,
  -- Optional message from requester: "I need this for the payments integration sprint"
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  reviewed_by       UUID REFERENCES users(id),
  reviewer_note     TEXT,
  -- Optional message from reviewer on approval/denial
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A user can only have one pending request per project at a time
  UNIQUE (project_id, requester_id, status)
  -- Note: the UNIQUE on status means they can have one pending + past denied records
  -- This is intentional — you want to see the history
);

CREATE INDEX idx_access_requests_project    ON access_requests(project_id);
CREATE INDEX idx_access_requests_requester  ON access_requests(requester_id);
CREATE INDEX idx_access_requests_org        ON access_requests(organization_id);
CREATE INDEX idx_access_requests_status     ON access_requests(status)
  WHERE status = 'pending';
  -- Partial index — most queries are for pending requests
```

---

## Access Request Flow — Full Specification

### From the member's side

1. Member navigates to the projects list in the dashboard
2. Private projects they don't have access to appear in a grayed-out state
   with a lock icon and a "Request Access" button visible
3. Member clicks "Request Access" → modal appears with:
   - Project name (read-only)
   - Role they want: Developer or Read-only (dropdown, defaults to Developer)
   - Optional message field: "Reason for request (optional)"
   - Submit button
4. On submit: `POST /api/projects/:projectId/access-requests`
5. Member sees "Request sent. You'll be notified when it's reviewed."
6. The "Request Access" button changes to "Request Pending" (disabled)
7. If they have a previous denied request, they can send a new one after 24 hours

### From the reviewer's side (org owner, org admin, project admin)

1. A notification badge appears on the org settings → members page
2. Reviewer opens the access requests queue (new tab in org settings)
3. Each request shows: requester name/email, project name, requested role,
   message if provided, time of request
4. Reviewer actions:
   - **Approve** — select the final role to grant (can differ from requested role,
     e.g. requested Developer but granted Read-only), optional note
   - **Deny** — required note explaining why
5. On approve: creates a `project_members` row, sends notification email to requester
6. On deny: updates request status, sends notification email to requester with reviewer's note
7. Requester gets email: "Your access request to [Project] was [approved/denied]"

### API routes to add

```
POST   /api/projects/:projectId/access-requests
       Create an access request.
       Auth: must be org member but NOT already a project member.
       Body: { requested_role: 'developer' | 'readonly', message?: string }
       Guard: check no pending request already exists for this user+project.

GET    /api/organizations/:orgId/access-requests
       List all pending access requests for the org.
       Auth: org owner or admin only.
       Query params: ?status=pending|approved|denied&project_id=...

PATCH  /api/access-requests/:requestId
       Approve or deny a request.
       Auth: org owner, org admin, or project admin for the relevant project.
       Body: {
         status: 'approved' | 'denied',
         granted_role?: 'developer' | 'readonly',  // required if approving
         reviewer_note?: string
       }
       On approve: inserts row into project_members, sends email.
       On deny: updates status, sends email.

DELETE /api/access-requests/:requestId
       Cancel a pending request (by the requester themselves).
       Auth: must be the requester. Request must be in 'pending' state.
```

---

## Updated Project Visibility Logic

### Who can see private projects in the list

A user sees a project in the project list if ANY of the following is true:
1. They are an org owner or org admin (they see all projects regardless of visibility)
2. The project visibility is `open` AND they are an org member (not guest)
3. The project visibility is `private` AND they are in `project_members` for that project
4. They are a guest AND they are in `project_members` for that project

A user can ACCESS (open, view secrets, manage tokens) a project only if:
1. They are an org owner (full access)
2. They are an org admin (full access)
3. They are in `project_members` for that project with their specific role

This means an org admin can SEE all projects (so they can manage them) but
project-level secrets/tokens still respect their `project_members` role.

### SQL helper for project list query

```sql
-- Projects a user can SEE (for the project list UI)
SELECT p.*
FROM projects p
WHERE p.organization_id = $orgId
  AND p.deleted_at IS NULL
  AND (
    -- Org owner or admin sees everything
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = p.organization_id
        AND om.user_id = $userId
        AND om.role IN ('owner', 'admin')
        AND om.joined_at IS NOT NULL
        AND (om.expires_at IS NULL OR om.expires_at > now())
    )
    OR
    -- Open project visible to all non-guest members
    (
      p.visibility = 'open'
      AND EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = p.organization_id
          AND om.user_id = $userId
          AND om.member_type = 'member'
          AND om.joined_at IS NOT NULL
          AND (om.expires_at IS NULL OR om.expires_at > now())
      )
    )
    OR
    -- Explicit project membership (handles private projects and guests)
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = p.id
        AND pm.user_id = $userId
        AND pm.accepted_at IS NOT NULL
    )
  )
ORDER BY p.created_at DESC;
```

---

## Updated Organization Invite Flow

The invite endpoint must now support the new fields:

```
POST /api/organizations/:orgId/invitations
Body: {
  email: string,
  role: 'admin' | 'developer' | 'readonly' | 'auditor',
  member_type?: 'member' | 'guest',   // defaults to 'member'
  expires_at?: string                  // ISO 8601, required if member_type is 'guest'
}
```

Validation:
- `guest` members must have an `expires_at` set (enforce this — a guest without
  an expiry is a mistake)
- `expires_at` must be at least 1 day in the future
- `auditor` role can only be invited by org owner

---

## Automatic Guest Expiry

Run a daily cron job (or check at request time) that marks expired memberships.

Option A — Check at request time (simpler, recommended for MVP):
```javascript
// In auth middleware, after fetching org membership:
if (membership.expires_at && membership.expires_at < new Date()) {
  // Membership has expired
  // Return 403 with error: 'membership_expired'
  // Optionally: auto-set joined_at = NULL (suspend) rather than delete
}
```

Option B — Scheduled cleanup (add later):
```sql
-- Run nightly: suspend expired guest memberships
UPDATE organization_members
SET joined_at = NULL
WHERE member_type = 'guest'
  AND expires_at < now()
  AND joined_at IS NOT NULL;
```

For MVP, use Option A. Add Option B when you add background job infrastructure.

---

## Org Setup Wizard — Small Team vs Large Org

During the first project creation (or as part of onboarding), ask one question:

```
How does your team work?

◉ Everyone on our team works on all projects together
  (Projects are open to all members by default)

○ We need project-level access control
  (Projects are private by default — members need explicit access)
```

This sets `organizations.default_project_visibility` to `open` or `private`.

The setting is editable later in org settings → General.

When switching from `open` to `private`:
- Existing open projects stay open (no breaking change)
- New projects default to private
- Show a warning: "This only affects new projects. Existing open projects remain open."

When switching from `private` to `open`:
- Only affects new projects
- Existing private projects stay private

---

## Auditor Role — Exact Permissions

The `auditor` org role can:
- View all audit log entries for the org
- View usage metrics (who resolved which token, when, from where)
- View the member list (names, emails, roles, join dates)
- View project names and which members belong to which project

The `auditor` org role cannot:
- See any secret key names or values
- See any proxy token values
- Create, update, or delete any resource
- Invite or remove members
- Approve or deny access requests
- Access any project's secrets/tokens page

Implement this as a permission check in every route:
```javascript
// In route handlers, check before returning sensitive data:
if (request.orgRole === 'auditor') {
  // Block access to: /secrets, /tokens, /resolve-bulk
  // Allow access to: /audit, /usage, /members
  return reply.status(403).send({ error: 'auditor_restricted' })
}
```

Add to the frontend: if `orgRole === 'auditor'`, hide all secrets/tokens UI
and show only the audit log and usage dashboard.

---

## Additional Error Cases to Handle

Add these to the error handling table from the original prompt:

| Scenario | Backend response | Frontend behaviour |
|---|---|---|
| Member tries to access private project without membership | 403 `project_access_required` | Show project card in list with lock icon + "Request Access" button |
| Member submits duplicate pending access request | 409 `request_already_pending` | Show "You already have a pending request for this project" |
| Access request approved but member has since left the org | 400 `requester_not_in_org` | Auto-cancel the request, show error to reviewer |
| Guest member's membership has expired | 403 `membership_expired` | Redirect to /expired-access page with message "Your guest access expired on [date]. Contact the org admin to renew." |
| Auditor tries to access secrets route | 403 `auditor_restricted` | Show "Your role does not permit access to this resource" |
| Member requests access to open project (shouldn't happen, but guard it) | 400 `already_has_access` | N/A — "Request Access" button should not appear for open projects |
| New member added to org, open projects auto-grant fails | Log error, do not block user | Non-blocking — user can still access open projects via the visibility query |

---

## Frontend Component Updates

### Project list card — three states

Each project card in the project list needs three visual states:

**State 1 — Full access**
Normal card with project name, secret count, last activity.
Click opens the project.

**State 2 — Visible but no access (private project, no membership)**
Grayed-out card with lock icon. Shows project name only.
Shows "Request Access" button.
If a pending request exists: shows "Request Pending" (disabled button).
If a previous request was denied: shows "Request Denied — try again in Xh".

**State 3 — Not visible (private project, not in member list)**
Does not appear in the list at all.
Exception: org owners and admins always see all projects regardless.

### Access requests page

Create `src/app/(dashboard)/settings/organization/access-requests/page.tsx`

This page is accessible by org owner and admin only.
Show a table with columns:
- Requester (name + email)
- Project
- Requested role
- Message (truncated, expand on hover)
- Requested at
- Actions: Approve (role dropdown) + Deny

When approving, show a small form:
```
Grant role: [Developer ▼]  (can downgrade from what was requested)
Note (optional): ____________
[Approve]  [Cancel]
```

When denying, require a note:
```
Reason (required): ____________
[Deny]  [Cancel]
```

### Guest member invite modal

When inviting a guest (member_type = 'guest'), the invite modal must show
an extra date picker field:

```
Email: _________________
Role: [Developer ▼]
Access type: ◉ Member  ○ Guest
                        ↓ (shows when Guest selected)
Expires on: [date picker — minimum 1 day from now]
```

### Member list — expiry indicators

In the org members table, show for guest members:
- If expires_at > 30 days: green chip "Guest · Expires [date]"
- If expires_at ≤ 30 days: amber chip "Guest · Expires in X days"
- If expires_at ≤ 7 days: red chip "Guest · Expires soon"
- If expired: red chip "Guest · Expired" — show Renew button for admins

---

## Updated Definition of Done

Add these items to the definition of done from the original prompt:

### Backend additions
- [ ] `projects.visibility` column added with `'open' | 'private'` constraint
- [ ] `organizations.default_project_visibility` column added
- [ ] `organization_members.member_type` column added with `'member' | 'guest'` constraint
- [ ] `organization_members.expires_at` column added
- [ ] `organization_members.role` CHECK constraint updated to include `'auditor'`
- [ ] `access_requests` table created with all indexes
- [ ] Org invite route accepts `member_type`, `expires_at` and validates guest requirements
- [ ] Project list query uses the full visibility logic SQL from this document
- [ ] `POST /api/projects/:projectId/access-requests` created
- [ ] `GET /api/organizations/:orgId/access-requests` created
- [ ] `PATCH /api/access-requests/:requestId` created with email notification
- [ ] `DELETE /api/access-requests/:requestId` created
- [ ] Guest expiry checked at auth middleware (Option A)
- [ ] Auditor role blocked from secrets/tokens routes
- [ ] Org setup question sets `default_project_visibility` on first project creation
- [ ] New project inherits `organization.default_project_visibility` on creation
- [ ] All 7 new error cases return the documented error codes
- [ ] Access request approval sends email via Resend
- [ ] Access request denial sends email with reviewer_note via Resend

### Frontend additions
- [ ] Project card has three visual states: full access, visible/no access, hidden
- [ ] "Request Access" button appears on private projects without membership
- [ ] "Request Pending" disabled state after request submitted
- [ ] Access requests review page created at `/settings/organization/access-requests`
- [ ] Approve flow with role selector and optional note
- [ ] Deny flow with required note
- [ ] Guest invite modal shows date picker when Guest selected
- [ ] Member list shows expiry chip for guest members with colour coding
- [ ] Auditor role: secrets/tokens UI hidden, only audit + usage shown
- [ ] Org setup wizard question sets `default_project_visibility`
- [ ] `TypeScript` types updated with all new fields

---

## Summary: The Three-Tier Access Model

To make this concrete for your agent, here is the complete access model in one place:

```
LEVEL 1 — Organization membership
  owner    → full org control, sees all projects, manages billing/members
  admin    → manages members and projects, sees all projects, approves requests
  developer → accesses open projects automatically, requests private project access
  readonly  → same as developer but read-only on all project resources they access
  auditor   → sees audit logs and metrics only, never sees secrets or tokens
  (guest)   → any of the above roles but with member_type=guest: expires_at required,
              cannot see member list, cannot create projects, explicit project access only

LEVEL 2 — Project access (project_members table)
  Determined by: org role + project visibility + explicit project_members row
  owner    → full project control
  admin    → manage project secrets and tokens, manage project members
  developer → create/use tokens, view secrets (masked), add new secrets
  readonly  → view token metadata only, cannot copy or resolve tokens

LEVEL 3 — Project visibility (projects.visibility)
  open     → developer/readonly org members automatically get developer-level project access
  private  → access requires explicit project_members row (via invite or approved request)
```

---

*Amendment version: 1.0 — April 2026*
*Applies to: AGENT_ORGANIZATIONS_FEATURE.md*