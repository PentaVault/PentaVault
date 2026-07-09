# Billing Lifecycle and Entitlement Policy

This document defines how PentaVault should behave when an organization upgrades, downgrades, cancels, fails to pay, or remains in a pending payment state. It also defines the process for adding future paid features so that billing behavior remains predictable and safe.

## Goals

- Billing must never hold a customer's data hostage.
- Paid features should degrade predictably when payment fails or a downgrade takes effect.
- Backend entitlement checks are the source of truth. Frontend checks are only user experience.
- A user can belong to multiple organizations, and each organization has its own billing state.
- Billing state must be auditable through billing history and organization activity.
- Future paid features must declare their downgrade and non-payment behavior before release.

## Organization-Level Billing Model

Subscriptions are organization-scoped, not user-scoped.

The same user may own, administer, or belong to multiple organizations. A paid subscription in one organization must not prevent the same user from purchasing or managing a separate subscription for another organization.

The billing customer record may still contain user contact information, but entitlement decisions must be keyed by organization:

- `organizationId`
- `billingCustomerId`
- `providerCustomerId`
- `providerSubscriptionId`
- `providerProductId`
- `plan`
- `effectivePlan`
- `billingState`
- `currentPeriodStart`
- `currentPeriodEnd`
- `graceEndsAt`

Provider-specific identity constraints must not leak into the product model. Polar requires customer email addresses to be unique inside a Polar organization, so PentaVault should use an organization-scoped Polar customer identity and preserve the real receipt or finance email in PentaVault billing profile fields. This prevents the same signed-in user from being blocked when they pay for multiple PentaVault organizations.

## Billing States

The application should resolve every organization into one of these states.

| State | Meaning | Entitlement result |
| --- | --- | --- |
| `free` | No active paid subscription. | Free limits only. |
| `pending_initial_payment` | Checkout started but payment has not succeeded. | Free limits only until payment is confirmed. |
| `active` | Paid subscription is current. | Paid plan entitlements apply. |
| `trialing` | Provider-side trial or internal grant is active. | Granted paid entitlements apply until trial end. |
| `past_due_grace` | Renewal failed, but the grace period is active. | Paid entitlements continue with warning banners and activity events. |
| `past_due_restricted` | Grace period expired without payment. | Organization remains accessible, but paid feature writes are blocked. |
| `payment_pending` | Provider reports a payment that may still settle. | Continue prior effective entitlements during short pending window, then move to grace or restricted. |
| `cancel_at_period_end` | Cancellation requested, paid access ends at period end. | Paid entitlements continue until period end. |
| `downgrade_scheduled` | Downgrade requested, lower plan applies next period. | Current paid entitlements continue until period end. |
| `canceled` | Subscription ended. | Target plan or free entitlements apply. |
| `revoked` | Provider or admin revoked access immediately. | Restricted or free entitlements apply immediately, depending on reason. |
| `admin_grant` | Internal grant gives paid access without provider payment. | Granted plan applies until grant expiry. |

## Grace Periods

### Renewal Payment Failure

PentaVault should provide a 21 calendar day grace period after the first confirmed renewal payment failure.

During the 21-day grace period:

- The organization keeps its current paid entitlements.
- Owners and admins see persistent billing warnings.
- Billing history records the failed payment and grace end date.
- Activity records should identify the organization and the user when known.
- Owners and admins can update payment details or open the billing portal.

After the 21-day grace period:

- The organization moves to `past_due_restricted`.
- Core read access remains available.
- Existing projects, secrets, audit logs, and organization metadata remain readable by authorized users.
- New paid-feature writes are blocked.
- Automations and integrations that depend on paid entitlements should pause instead of silently failing.
- Owners and admins can still access billing, invoices, exports, and payment recovery.

The entire system should not be locked. PentaVault should avoid a hard lockout because it manages security-sensitive data.

### Initial Checkout Pending

An organization should not receive paid entitlements merely because a checkout session was created.

Recommended policy:

- Keep the organization on its current plan until a confirmed provider event arrives.
- If this is the first purchase from Free, keep Free entitlements until `order.paid` or an active subscription event is processed.
- Treat an unfinished checkout as pending for up to 24 hours.
- After 24 hours without provider confirmation, mark the checkout as abandoned in billing history.

### Long Payment Pending State

Some providers or payment methods may report a pending state for longer than a card authorization.

Recommended policy:

- If the organization already had an active paid subscription, continue the previous effective plan for up to 7 calendar days while payment is pending.
- If the pending payment follows a failed renewal, the 7-day pending window must not extend the total non-payment grace beyond 21 days.
- If this is a new upgrade from Free, do not unlock paid features until payment succeeds.
- After 7 days pending, move to `past_due_grace` or `past_due_restricted` based on the original failure date.

## Cancellation Policy

When a user cancels mid-month:

- The subscription should be set to cancel at period end whenever the provider supports it.
- Paid entitlements continue until `currentPeriodEnd`.
- Billing UI should show the exact access end date.
- Billing history records who requested cancellation.
- Organization activity records the cancellation request.
- Owners and admins can resume before the period ends if the provider supports uncancel.

At period end:

- The organization moves to Free unless a different target plan was selected.
- Over-limit resources remain readable.
- New writes that exceed Free limits are blocked.
- Paid integrations, advanced controls, and paid automation stop according to each feature's degradation rule.

Immediate cancellation should be reserved for fraud, chargeback, abuse, explicit admin action, or provider revocation.

## Downgrade Policy

Downgrades should normally take effect at the next billing period.

When an organization downgrades from Team to Pro or Pro to Free:

- Current entitlements continue until `currentPeriodEnd`.
- The selected target plan is stored as `scheduledPlan`.
- Billing UI must persist the downgrade message after refresh.
- Billing history records the scheduled downgrade.
- Activity records who scheduled the downgrade.

At period end:

- `effectivePlan` changes to the scheduled plan.
- Over-limit resources remain readable.
- Creating or enabling resources above the new plan limit is blocked.
- Paid features outside the new plan stop accepting writes.
- The UI should show a cleanup checklist for anything over the new limit.

Downgrades should not delete data automatically.

## Upgrade Policy

Upgrades should apply after provider confirmation.

For Free to Pro or Free to Team:

- Start checkout.
- Keep Free entitlements until the provider confirms payment.
- Apply the paid plan after confirmed `order.paid` or subscription active event.

For Pro to Team:

- Use provider-supported subscription update when available.
- If the provider cannot safely update the subscription in place, use a managed checkout flow that carries organization metadata.
- The organization must not be marked Team until provider confirmation arrives.
- Billing history should clearly distinguish `upgrade.started`, `upgrade.confirmed`, and `upgrade.failed`.

### Proration and Discount Handling

For mid-cycle Pro to Team upgrades:

- Prefer provider-managed prorations if supported.
- If provider-managed proration is not available, charge the Team price from the next cycle and optionally grant Team immediately through an internal temporary grant.
- Do not implement manual credit arithmetic in the frontend.
- Any discount, voucher, or credit must be represented in backend billing records and billing history.

## Seat Changes

Seats are organization-scoped.

### Adding Members

When an owner or admin adds members:

- If the current plan has enough included or purchased seats, allow the invite.
- If adding the member requires more paid seats, initiate a provider seat quantity update or checkout update.
- Do not grant access beyond the plan's hard seat cap.
- For Pro, enforce the Pro maximum member limit. If Pro has a maximum of 15 users, the 16th user requires Team.
- For Team, enforce the configured Team maximum or contact-sales threshold.

If provider seat update fails:

- Do not add the extra paid seat silently.
- Keep the invite pending or blocked.
- Show a billing recovery action to owners/admins.

### Removing Members

When members are removed:

- Access is revoked immediately according to organization membership rules.
- Provider seat quantity should be reduced according to the provider's normal billing behavior.
- If the provider only applies seat reductions next cycle, show the effective date in billing UI.
- Billing history records the seat count change.

## Feature Degradation Rules

Paid features must define their behavior for downgrade and non-payment before release.

Use these degradation categories:

| Category | During grace | After grace or downgrade | Example behavior |
| --- | --- | --- | --- |
| Core data | Fully available | Read/export available, destructive actions still permission checked | Projects, secrets metadata, audit logs |
| Paid capacity | Available | Existing data readable, new writes blocked above limit | Extra projects, extra members, extra environments |
| Paid controls | Available | Controls become read-only or disabled | Advanced RBAC, approval policies |
| Paid integrations | Available | New syncs disabled, existing configs visible | Webhooks, external sync, advanced notifications |
| Paid automation | Available | Jobs pause with clear reason | Scheduled scans, automated rotations |
| Paid support/SLA | Available | Reverts to lower-tier support | Priority support |

Feature behavior must be explicit. Do not rely on scattered plan checks.

## Recommended Entitlement Mechanism

Backend services should resolve a single entitlement snapshot per request:

```ts
type BillingEntitlementSnapshot = {
  organizationId: string
  plan: "free" | "pro" | "team"
  effectivePlan: "free" | "pro" | "team"
  billingState:
    | "free"
    | "pending_initial_payment"
    | "active"
    | "trialing"
    | "past_due_grace"
    | "past_due_restricted"
    | "payment_pending"
    | "cancel_at_period_end"
    | "downgrade_scheduled"
    | "canceled"
    | "revoked"
    | "admin_grant"
  graceEndsAt: string | null
  currentPeriodEnd: string | null
  scheduledPlan: "free" | "pro" | "team" | null
  restricted: boolean
  recoveryRequired: boolean
  limits: {
    members: number
    projects: number
    environments: number
    auditRetentionDays: number
  }
  features: Record<string, boolean>
}
```

All sensitive routes must call backend entitlement helpers before performing paid actions.

Required enforcement points:

- Organization member invite and role changes.
- Project creation.
- Environment creation.
- Secret write and rotation features if plan gated.
- Proxy token or integration creation if plan gated.
- Audit log retention and export features.
- Billing portal and plan changes, owner/admin only.

The frontend may use the same snapshot to render plan badges, banners, disabled actions, and upgrade prompts.

## Scheduled Jobs

The backend should run periodic billing maintenance.

Recommended jobs:

- `billing.sync-provider-state`: fetch provider subscription state for recently changed subscriptions.
- `billing.apply-period-end-changes`: apply scheduled cancellations and downgrades.
- `billing.expire-grace-periods`: move expired grace subscriptions to restricted state.
- `billing.expire-pending-checkouts`: mark old incomplete checkouts abandoned.
- `billing.reconcile-seat-quantity`: detect mismatches between organization members and paid seats.

Jobs must be idempotent and safe to retry.

## Webhook Requirements

Provider webhooks should be treated as the strongest source of billing state, but they must be idempotent.

Every webhook event should record:

- Provider event ID.
- Event type.
- Organization ID from metadata when available.
- Provider customer ID.
- Provider subscription ID.
- Provider product ID.
- Previous local billing state.
- New local billing state.
- Processing result.

If a webhook lacks organization metadata, the backend should attempt safe reconciliation through known subscription/customer records. If reconciliation is ambiguous, do not change entitlements. Record the event as needing manual review.

## Manual Grants, Discounts, and Vouchers

Internal free access should be represented as a billing grant, not a fake provider subscription.

Grant fields:

- Organization ID.
- Granted plan.
- Start time.
- End time.
- Reason.
- Granted by user/admin.
- Optional seat limit override.

Examples:

- Two-month Team access for a design partner.
- Temporary Pro access while a payment issue is resolved.
- Voucher-backed subscription period.

Grants must expire automatically and produce billing history entries.

## User Experience Requirements

Billing UI should adapt by plan and state.

Free:

- Show one primary upgrade action.
- The plan picker shows Free, Pro, and Team.
- Explain plan limits and upgrade benefits.

Active paid:

- Show current plan, renewal date, seats, billing contact, invoice email, and billing history.
- Show one primary change-plan action.
- Show manage billing only once.
- Show cancellation or downgrade status if scheduled.

Grace:

- Show payment recovery banner.
- Show grace end date.
- Keep the app usable.
- Warn owners/admins at login and on billing page.

Restricted:

- Show recovery banner.
- Allow billing recovery, invoices, exports, and read access.
- Disable paid writes with clear reason.

Scheduled downgrade or cancellation:

- Persist the scheduled message after refresh.
- Show effective date and target plan.
- Offer resume/undo if provider supports it.

## Activity and Audit Requirements

Billing events should appear in billing history. Important billing events should also appear in organization activity.

Record at minimum:

- Checkout started.
- Subscription activated.
- Upgrade confirmed.
- Upgrade failed.
- Downgrade scheduled.
- Downgrade applied.
- Cancellation scheduled.
- Cancellation resumed.
- Payment failed.
- Grace started.
- Grace expired.
- Subscription restricted.
- Subscription recovered.
- Seat quantity changed.
- Billing profile updated.
- Billing portal opened.

When a user action caused the event, record the user ID. When the provider caused the event, record it as provider-originated and include provider event metadata.

## Adding Future Paid Features

Every new paid feature must include a billing behavior section before implementation.

Feature owners must answer:

1. Which plans include this feature?
2. Is the feature read-only, write-based, capacity-based, or automation-based?
3. What happens during the 21-day grace period?
4. What happens after grace expires?
5. What happens after a downgrade?
6. Are existing resources preserved?
7. Which backend routes enforce the entitlement?
8. Which scheduled jobs or workers must check entitlements?
9. What UI message appears when the feature is unavailable?
10. What billing history or activity events are emitted?

No paid feature should ship with frontend-only gating.

## Default Policy Decisions

- Grace period after renewal failure: 21 calendar days.
- Pending initial checkout: 24 hours before marking abandoned.
- Extended pending payment for existing paid subscription: up to 7 calendar days, included inside the 21-day total grace window.
- Cancellation: at period end by default.
- Downgrade: at period end by default.
- Immediate restriction: only for fraud, chargeback, abuse, provider revocation, or explicit admin action.
- Data deletion: never automatic because of billing downgrade or non-payment.
- Full app lockout: never for ordinary billing failure.
- Paid writes after grace: blocked until payment recovery or valid grant.
