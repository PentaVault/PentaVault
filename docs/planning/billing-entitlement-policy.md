# Billing Entitlement and Degradation Policy

## Purpose

PentaVault billing is organization-scoped. A user may belong to or own many
organizations, but every paid entitlement is evaluated against the active
organization. Payment failure, downgrade, cancellation, or a future provider
migration must not create different app behavior for the same organization
state.

This policy is the required reference for every paid feature added to
PentaVault. A feature is not ready until its downgrade and non-payment behavior
is defined here and enforced by the backend.

## Lifecycle States

- `active_paid`: the subscription is active or trialing. The organization gets
  the paid plan's full entitlement.
- `pending_checkout`: checkout was created, but the provider has not confirmed a
  paid subscription. The organization keeps its previous effective plan.
- `pending_upgrade`: an upgrade was requested. The organization changes only
  after the provider accepts the update.
- `pending_downgrade`: a downgrade is scheduled for the next billing period. The
  current paid plan remains effective until `currentPeriodEnd`.
- `pending_cancel`: cancellation is scheduled for period end. Paid access remains
  effective until `currentPeriodEnd`.
- `past_due_grace`: renewal payment failed, but the organization is inside the
  grace period. Paid access remains available with recovery warnings.
- `past_due_restricted`: the grace period expired or the provider revoked the
  subscription. The organization falls back to the next valid entitlement,
  usually Free unless an internal grant exists.
- `grant_active`: an internal PentaVault grant overrides the normal paid/free
  result until its expiry.

## Grace Period

Use a 21-day payment recovery grace period for subscription renewals. This
matches Polar's full dunning window: retries after 2, 5, 7, and 7 additional
days. During this window the subscription may be `past_due`, but PentaVault keeps
the paid entitlement active and shows prominent payment recovery messaging.

The grace period only applies to renewal failures. It does not grant paid access
for a new checkout that has not succeeded, and it does not make a failed upgrade
take effect.

## Locking Rules

Billing must not hard-lock the entire organization for normal non-payment or
downgrade. Always allow:

- sign in
- viewing existing projects and secrets the user could already access
- billing page and payment recovery
- updating payment method through the provider portal
- exporting data
- removing members or resources to return within limits
- canceling or uncanceling where the provider supports it

Security or abuse systems may lock an account independently, but billing
degradation is not a security lock.

## Feature Degradation

| Capability | Free | Pro | Team | Degradation rule |
| --- | --- | --- | --- | --- |
| Members | 3 | 15 | Unlimited | Do not remove members. Block new invites/adds above limit. Always allow removals. |
| Projects | Unlimited | Unlimited | Unlimited | If future limits are added, block creates above limit; keep existing projects accessible. |
| Environments per project | 2 | Unlimited | Unlimited | Keep existing environments. Block new creates above limit. |
| Change requests | No | Yes | Yes | Block new requests. Existing requests remain viewable and actionable so work is not stranded. |
| Custom project roles | No | Yes | Yes | Block creating or editing paid role policy. Preserve existing enforcement until migrated. |
| Security analytics | No | No | Yes | Block analytics reads with an upgrade-required response. Preserve raw audit/activity access according to retention. |
| Trusted IPs/device binding | No | No | Yes | Preserve enforcement to avoid weakening security. Block adding/editing rules after downgrade. |
| Webhook/security alerts | No | No | Yes | Pause outbound delivery. Keep configuration stored and resume if Team entitlement returns. |
| Secret rotation reminders | Yes | Yes | Yes | If made paid later, keep existing reminders visible and block new paid-only reminders. |
| Audit retention | 7 days | 60 days | 180 days | Apply shorter retention only after effective downgrade/grace expiry, never during pending downgrade or grace. |

## Billing State Transitions

- Free to paid: paid features start only after provider confirmation or a
  verified active subscription webhook.
- Pro to Team: apply immediately only if provider accepts the update. Use
  proration for the remaining billing period.
- Team to Pro: schedule at period end. Block if active member count is above 15.
- Paid to Free: schedule cancellation at period end. Keep paid access until the
  current period ends.
- Renewal failure: enter `past_due_grace`, show warnings, and keep paid access
  for 21 days.
- Grace expiry or provider revoke: enter `past_due_restricted` and evaluate the
  organization as Free unless a grant is active.
- Payment recovery: restore `active_paid`, clear grace warnings, and write a
  billing activity event.

## Internal Grants

Use internal grants for support-issued free access, temporary trials, vouchers,
or manual exceptions. Do not create fake paid subscriptions for these cases.

A grant must record:

- organization id
- granted plan
- optional seat limit
- start and end timestamps
- reason
- creator user id
- audit metadata

When a grant expires, the organization falls back to its active paid
subscription if one exists, otherwise Free.

## Required Mechanism for New Paid Features

Every new paid feature must declare:

- minimum plan
- degradation mode: `block_create`, `block_read`, `pause_delivery`,
  `preserve_enforcement`, `retention_shrink`, or `quota_create_only`
- what existing data remains visible
- what mutations are blocked
- whether background jobs pause or continue
- whether security enforcement must be preserved
- recovery path
- tests required

Backend enforcement is mandatory. Frontend gating is UX only.

## Required Tests

- Past-due inside 21-day grace keeps current paid plan.
- Past-due after 21 days falls back to Free unless a grant is active.
- New checkout pending does not grant paid features.
- Failed upgrade keeps the previous plan.
- Scheduled downgrade keeps current paid plan until period end.
- Scheduled cancellation keeps paid plan until period end.
- Team to Pro over 15 members is blocked.
- Over-limit members/environments are preserved but new creates are blocked.
- Team-only alert delivery pauses after restriction and resumes after recovery.
- Trusted IP enforcement remains active after downgrade, while edits are blocked.
- Audit retention purge is applied only after effective downgrade or grace expiry.
