# PentaVault Error Inventory

Completion Status: Complete - inventory and blueprint recorded

This document is the implementation blueprint for the error-handling overhaul across the frontend in `/home/ubuntu/PentaVault` and the backend in `/home/ubuntu/PentaVault/PentaVault-Backend`.

It was produced after auditing:

- backend Fastify route handlers in `apps/api/src/plugins/*.ts`
- backend auth/project/secret/token service and type surfaces
- backend DB schema constraints in `packages/db/src/*.ts`
- backend integration and contract tests
- frontend API clients, error utilities, data hooks, and form/page consumers

## Audit Summary

- Backend currently mixes custom JSON errors with proxied Better Auth upstream payloads.
- Backend validation failures are mostly generic `INVALID_REQUEST` responses with no field map.
- Backend `500` responses are inconsistent about `requestId`.
- Frontend error handling is partially centralized, but the registry is incomplete.
- Frontend forms mostly use a single form-level string or toast instead of field-level API errors.
- Page loading states exist in several views, but shared error/empty states are inconsistent.

## Implementation Target

The following is the target contract to implement and consume.

### Domain: Authentication

#### AUTH-001 - Wrong email or password
- Trigger: `POST /api/auth/sign-in/email` with incorrect credentials
- Backend: `401` with `{ code: "AUTH_INVALID_CREDENTIALS", error: "The email or password you entered is incorrect." }`
- Frontend toast: `Incorrect email or password. Please try again.`
- Frontend inline: highlight both email and password fields

#### AUTH-002 - Account does not exist
- Trigger: `POST /api/auth/sign-in/email` with unknown email
- Backend: same response as `AUTH-001`
- Frontend: same response as `AUTH-001`

#### AUTH-003 - Email already registered
- Trigger: `POST /api/auth/sign-up/email` with duplicate email
- Backend: `409` with `{ code: "AUTH_EMAIL_ALREADY_EXISTS", error: "An account with this email address already exists." }`
- Frontend toast: `An account with this email address already exists. Try signing in instead.`
- Frontend inline: email field

#### AUTH-004 - Password too weak
- Trigger: `POST /api/auth/sign-up/email` with password that fails policy
- Backend: `400` with `{ code: "AUTH_PASSWORD_TOO_WEAK", error: "Password must be at least 8 characters and contain at least one number.", fields: { password: "Password must be at least 8 characters and include at least one number." } }`
- Frontend inline: password field only

#### AUTH-005 - Email format invalid
- Trigger: auth sign-in or sign-up with malformed email
- Backend: `400` with `{ code: "AUTH_EMAIL_INVALID", error: "Please enter a valid email address.", fields: { email: "Please enter a valid email address." } }`
- Frontend inline: email field on blur / submit

#### AUTH-006 - Name too short
- Trigger: auth registration with `name.length < 2`
- Backend: `400` with `{ code: "AUTH_NAME_TOO_SHORT", error: "Your name must be at least 2 characters long.", fields: { name: "Your name must be at least 2 characters long." } }`
- Frontend inline: name field

#### AUTH-007 - Session expired
- Trigger: authenticated request with expired or invalid session
- Backend: `401` with `{ code: "UNAUTHORIZED", error: "Your session has expired. Please sign in again." }`
- Frontend behavior: redirect to `/login?expired=1&next=...`
- Frontend toast: `Your session expired. Please sign in again.`

#### AUTH-008 - Too many sign-in attempts
- Trigger: auth route rate limit exceeded
- Backend: `429` with `{ code: "RATE_LIMITED", error: "Too many sign-in attempts. Please wait 15 minutes before trying again.", retryAfter: 900 }`
- Frontend toast: `Too many sign-in attempts. Please try again in 15 minutes.`
- Frontend inline: disable submit and show countdown when `retryAfter` is present

#### AUTH-009 - Device code not found
- Trigger: `POST /api/auth/device/approve` with invalid or expired code
- Backend: `404` with `{ code: "DEVICE_CODE_NOT_FOUND", error: "This device code has expired or does not exist. Start a new sign-in from your CLI." }`
- Frontend toast: `Device code not found or expired. Run vaultproxy login again from your terminal.`

#### AUTH-010 - Device code already used
- Trigger: `POST /api/auth/device/approve` with an already-processed code
- Backend: `409` with `{ code: "DEVICE_CODE_ALREADY_USED", error: "This device has already been approved." }`
- Frontend toast: `This device has already been approved. Check your CLI - it may already be connected.`

#### AUTH-011 - Backend unreachable
- Trigger: Axios error with no `response`
- Backend: n/a
- Frontend sign-in toast: `Cannot connect to the server. Check your internet connection or try again in a moment.`
- Frontend general toast: `Action failed: server is not responding. Check your connection and try again.`

#### AUTH-012 - Session revocation failure
- Trigger: session revoke request fails unexpectedly
- Backend: `500` with `{ code: "SESSION_REVOKE_FAILURE", error: "Unable to revoke this session right now.", requestId }`
- Frontend toast: `Unable to revoke this session. Please try again. (ref: {requestId})`

### Domain: Projects

#### PROJ-001 - Project name empty
- Trigger: `POST /api/v1/projects` with empty trimmed name
- Backend: `400` with `{ code: "PROJ_NAME_REQUIRED", error: "Project name is required and cannot be empty.", fields: { name: "Project name is required and cannot be empty." } }`
- Frontend inline: name field

#### PROJ-002 - Project name too long
- Trigger: project create/update with `name.length > 120`
- Backend: `400` with `{ code: "PROJ_NAME_TOO_LONG", error: "Project name must be 120 characters or fewer. Yours is {actual} characters.", fields: { name: "Project name must be 120 characters or fewer. Yours is {actual} characters." } }`
- Frontend inline: name field and counter

#### PROJ-003 - Slug format invalid
- Trigger: project create/update slug fails `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- Backend: `400` with `{ code: "PROJ_SLUG_INVALID", error: "Slug can only contain lowercase letters, numbers, and hyphens. It cannot start or end with a hyphen.", fields: { slug: "Slug can only contain lowercase letters, numbers, and hyphens. It cannot start or end with a hyphen." } }`
- Frontend inline: slug field

#### PROJ-004 - Slug already taken
- Trigger: explicit custom slug conflict on create or update
- Backend: `409` with `{ code: "PROJECT_SLUG_CONFLICT", error: "The slug '{slug}' is already taken. Try '{suggestedSlug}'.", suggestedSlug: "..." }`
- Frontend toast: `Slug already taken. We've suggested '{suggestedSlug}' - submit again to use it.`
- Frontend behavior: prefill suggested slug

#### PROJ-005 - Project not found
- Trigger: get/update/delete project where record is missing or not visible
- Backend: `404` with `{ code: "PROJECT_NOT_FOUND", error: "Project not found. It may have been deleted or you may not have access." }`
- Frontend page state: `Project unavailable`

#### PROJ-006 - Project forbidden
- Trigger: owner-only project action by non-owner
- Backend: `403` with `{ code: "PROJECT_FORBIDDEN", error: "Only the project owner can perform this action." }`
- Frontend toast: `Only the project owner can do that.`
- Frontend behavior: disable action buttons when role is insufficient

#### PROJ-007 - Delete confirmation mismatch
- Trigger: wrong slug typed in frontend confirmation
- Backend: no request
- Frontend inline: `That doesn't match the project slug. Type '{slug}' to confirm deletion.`

#### PROJ-008 - Empty project update
- Trigger: `PATCH /api/v1/projects/:id` with no updatable fields
- Backend: `400` with `{ code: "PROJ_UPDATE_EMPTY", error: "Provide at least one field to update (name, slug, or status)." }`
- Frontend behavior: disable save when unchanged

#### PROJ-009 - Already archived
- Trigger: archive already-archived project
- Backend: `400` with `{ code: "PROJ_ALREADY_ARCHIVED", error: "This project is already archived." }`
- Frontend behavior: do not render archive action when already archived

#### PROJ-010 - Project create failure
- Trigger: unexpected server failure creating project
- Backend: `500` with `{ code: "PROJECT_CREATE_FAILURE", error: "Project creation failed: {sanitized reason}", requestId }`
- Frontend toast: `Project creation failed unexpectedly. (ref: {requestId}) Please try again or contact support.`

### Domain: Secrets

#### SEC-001 - Secret name empty
- Trigger: `POST /api/v1/secrets` with empty name
- Backend: `400` with `{ code: "SECRET_NAME_REQUIRED", error: "Secret name is required.", fields: { name: "Secret name is required." } }`
- Frontend inline: name field

#### SEC-002 - Secret name invalid
- Trigger: secret name fails uppercase/underscore format policy
- Backend: `400` with `{ code: "SECRET_NAME_INVALID", error: "Secret name can only contain uppercase letters, numbers, and underscores (e.g. STRIPE_API_KEY).", fields: { name: "Secret name can only contain uppercase letters, numbers, and underscores (e.g. STRIPE_API_KEY)." } }`
- Frontend inline: name field

#### SEC-003 - Secret value empty
- Trigger: empty plaintext
- Backend: `400` with `{ code: "SECRET_VALUE_REQUIRED", error: "Secret value cannot be empty.", fields: { plaintext: "Secret value cannot be empty." } }`
- Frontend inline: value field

#### SEC-004 - Duplicate secret
- Trigger: create/import secret conflict in same project and environment
- Backend: `409` with `{ code: "SECRET_CONFLICT", error: "A secret named '{name}' already exists in the {environment} environment for this project." }`
- Frontend toast: `A secret named '{name}' already exists in {environment}. Update the existing secret instead.`

#### SEC-005 - Secret not found
- Trigger: token issue references deleted or missing secret
- Backend: `404` with `{ code: "SECRET_NOT_FOUND", error: "Secret not found. It may have been deleted." }`
- Frontend state/toast: `Secret unavailable`

#### SEC-006 - Import invalid format
- Trigger: malformed bulk import body / parse failure
- Backend: `400` with `{ code: "SECRET_IMPORT_INVALID_FORMAT", error: "Could not parse the provided secrets. Ensure each line is in KEY=VALUE format." }`
- Frontend toast: `Import failed: couldn't parse the input. Use KEY=VALUE format, one per line.`

#### SEC-007 - Import empty
- Trigger: no secrets provided
- Backend: `400` with `{ code: "SECRET_IMPORT_EMPTY", error: "No secrets to import. Add at least one KEY=VALUE pair.", fields: { secrets: "No secrets to import. Add at least one KEY=VALUE pair." } }`
- Frontend inline: textarea field

#### SEC-008 - Import partial failure
- Trigger: batch import has mixed success/failure
- Backend: `207` with `{ imported: [...], failed: [{ name, reason }] }`
- Frontend toast: `{n} secrets imported. {m} failed.`
- Frontend detail: expandable failed list

### Domain: Tokens

#### TOK-001 - Token not found
- Trigger: revoke missing token
- Backend: `404` with `{ code: "TOKEN_NOT_FOUND", error: "Token not found. It may have already been revoked or deleted." }`
- Frontend toast: `Token not found - it may already be revoked.`

#### TOK-002 - Token already revoked
- Trigger: revoke already revoked token
- Backend: `409` with `{ code: "TOKEN_ALREADY_REVOKED", error: "This token was already revoked on {revokedAt}." }`
- Frontend toast: `This token was already revoked.`
- Frontend behavior: refresh token state

#### TOK-003 - Token policy denied
- Trigger: `/api/v1/resolve-bulk` policy failures
- Backend: `403` with `{ code: "TOKEN_POLICY_DENIED", error: "One or more tokens could not be resolved.", denied: [{ token, code, reason }] }`
- Consumer: CLI/backend contract

#### TOK-004 - Secret missing during token issue
- Trigger: issue token for non-existent secret
- Backend: `404` with `{ code: "SECRET_NOT_FOUND", error: "Cannot issue token: the secret does not exist or has been deleted." }`
- Frontend toast: `Cannot issue token - the secret no longer exists.`

#### TOK-005 - Expiry in past
- Trigger: issue token with past timestamp
- Backend: `400` with `{ code: "TOKEN_EXPIRY_INVALID", error: "Token expiry date must be in the future.", fields: { expiresAt: "Token expiry date must be in the future." } }`
- Frontend inline: expiry field

### Domain: Team Members

#### TEAM-001 - Member already exists
- Trigger: add existing project member
- Backend: `409` with `{ code: "PROJECT_MEMBER_CONFLICT", error: "This user is already a member of this project." }`
- Frontend toast: `That user is already a member of this project.`

#### TEAM-002 - User not found
- Trigger: add member with unknown user ID
- Backend: `404` with `{ code: "PROJECT_MEMBER_USER_NOT_FOUND", error: "No user found with that ID. Verify the user ID and try again." }`
- Frontend toast: `User not found. Check the ID and try again.`

#### TEAM-003 - Owner role immutable
- Trigger: patch owner membership role
- Backend: `400` with `{ code: "PROJECT_OWNER_MUTATION_NOT_ALLOWED", error: "The project owner's role cannot be changed. Transfer ownership first." }`
- Frontend behavior: disable owner selector

#### TEAM-004 - Cannot remove last owner
- Trigger: delete the only owner
- Backend: `400` with `{ code: "PROJECT_CANNOT_REMOVE_LAST_OWNER", error: "Cannot remove the only owner. Add another owner or delete the project." }`
- Frontend toast: `Cannot remove the only project owner. Assign another owner first.`

#### TEAM-005 - Owner self-remove blocked
- Trigger: owner removes own owner row
- Backend: `400` with `{ code: "PROJECT_OWNER_SELF_REMOVE", error: "You cannot remove yourself as the project owner. Transfer ownership first." }`
- Frontend behavior: disable remove button

### Domain: Sessions

#### SESS-001 - Session not found
- Trigger: revoke missing session
- Backend: `404` with `{ code: "SESSION_NOT_FOUND", error: "Session not found. It may have already expired or been revoked." }`
- Frontend toast: `Session not found - it may have already expired.`

#### SESS-002 - Cannot revoke current session
- Trigger: revoke currently active session from settings
- Backend: `400` with `{ code: "SESSION_CANNOT_REVOKE_CURRENT", error: "You cannot revoke your current active session from here. Use Sign Out instead." }`
- Frontend behavior: disable revoke button and mark as active

### Domain: General / Infrastructure

#### GEN-001 - Request too large
- Trigger: request exceeds body limit
- Backend: `413` with `{ code: "REQUEST_TOO_LARGE", error: "Request body is too large. Maximum size is {limit}." }`
- Frontend toast: `Your request is too large. Try reducing the amount of data and try again.`

#### GEN-002 - Request timeout
- Trigger: Axios timeout / cancellation
- Backend: n/a
- Frontend toast: `Request timed out. The server took too long to respond. Please try again.`

#### GEN-003 - Unexpected server error
- Trigger: uncaught route error
- Backend: `500` with `{ code: "{DOMAIN}_FAILURE", error: "An unexpected error occurred.", requestId }`
- Frontend toast: `Something went wrong on our end. (ref: {requestId}) Please try again.`

#### GEN-004 - Unknown API route
- Trigger: request to missing backend route
- Backend: `404` with `{ code: "ROUTE_NOT_FOUND", error: "API endpoint not found: {method} {path}" }`
- Frontend behavior: log as unexpected API mismatch

#### GEN-005 - Invalid JSON body
- Trigger: malformed JSON
- Backend: `400` with `{ code: "INVALID_JSON", error: "Request body contains invalid JSON." }`
- Frontend behavior: log as unexpected client/runtime bug

## Implementation Notes

- Prefer field-specific validation codes where the inventory names one explicitly.
- For generic route-level Zod failures outside named inventory items, return domain validation codes with a `fields` map.
- Every `500` response should include `requestId`.
- Auth passthrough routes need response remapping for Better Auth upstream errors.
- Frontend should prefer inline field errors over toasts for validation failures.
- Frontend should differentiate network failure, timeout, unauthorized redirect, validation error, conflict, and unexpected `500` cases.
