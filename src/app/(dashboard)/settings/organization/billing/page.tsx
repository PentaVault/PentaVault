'use client'

import {
  ArrowRight,
  CreditCard,
  History,
  Mail,
  ShieldCheck,
  TriangleAlert,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getBillingPlansPath, getMonthlySeatTotal, normalizePlanId } from '@/lib/billing/plan-utils'
import { PLANS, type Plan, type PlanId } from '@/lib/billing/plans'
import { useAuth } from '@/lib/hooks/use-auth'
import {
  isPaidPlan,
  useBillingHistory,
  useBillingProfile,
  useBillingSummary,
  useOpenBillingPortal,
  useUpdateBillingProfile,
} from '@/lib/hooks/use-billing'
import { useOrganizationMembers } from '@/lib/hooks/use-team'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatSeatLimit(plan: Plan): string {
  return plan.limits.members === null ? 'Unlimited seats' : `Up to ${plan.limits.members} seats`
}

function formatDate(value: string | null): string | null {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function billingStatusLabel(status: string | null): string {
  if (status === 'past_due') return 'Past due'
  if (status === 'canceled' || status === 'cancelled' || status === 'revoked') return 'Canceled'
  if (status === 'trialing') return 'Trialing'
  if (status === 'active') return 'Active'
  return 'Not connected'
}

function historyEventLabel(eventType: string): string {
  if (eventType === 'billing.checkout.created') return 'Checkout created'
  if (eventType === 'billing.subscription.changed') return 'Subscription changed'
  if (eventType === 'billing.subscription.change_scheduled') return 'Plan change scheduled'
  if (eventType === 'billing.subscription.cancel_scheduled') return 'Cancellation scheduled'
  if (eventType === 'billing.portal.opened') return 'Billing portal opened'
  if (eventType.startsWith('subscription.')) return `Polar ${eventType.replaceAll('.', ' ')}`
  if (eventType.startsWith('checkout.')) return `Polar ${eventType.replaceAll('.', ' ')}`
  if (eventType.startsWith('order.')) return `Polar ${eventType.replaceAll('.', ' ')}`
  return eventType.replaceAll('.', ' ')
}

function formatPlanName(planId: PlanId | null): string {
  return PLANS.find((plan) => plan.id === planId)?.name ?? 'Unknown'
}

type BillingProfileForm = {
  receiptEmail: string
  financeEmails: string
  businessName: string
  taxId: string
  line1: string
  line2: string
  city: string
  state: string
  postalCode: string
  country: string
}

const emptyProfileForm: BillingProfileForm = {
  receiptEmail: '',
  financeEmails: '',
  businessName: '',
  taxId: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
}

function parseFinanceEmails(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,\n]/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
    ),
  ]
}

function toNullableString(value: string): string | null {
  return value.trim() || null
}

function lifecycleMessage(input: {
  lifecycleState: string | undefined
  pendingPlan?: PlanId | null
  pendingDate: string | null
  graceEndsAt: string | null
}): string | null {
  if (input.lifecycleState === 'past_due_grace') {
    return input.graceEndsAt
      ? `Payment recovery is open until ${input.graceEndsAt}. Paid access remains active during grace.`
      : 'Payment recovery is open. Paid access remains active during grace.'
  }

  if (input.lifecycleState === 'past_due_restricted') {
    return 'The payment grace period ended. Paid-only actions are restricted until billing recovers.'
  }

  if (input.lifecycleState === 'pending_cancel') {
    return input.pendingDate
      ? `Cancellation is scheduled for ${input.pendingDate}. Paid access remains available until then.`
      : 'Cancellation is scheduled for period end. Paid access remains available until then.'
  }

  if (input.lifecycleState === 'pending_downgrade') {
    return input.pendingDate
      ? `Downgrade to ${input.pendingPlan ?? 'the selected plan'} is scheduled for ${input.pendingDate}.`
      : `Downgrade to ${input.pendingPlan ?? 'the selected plan'} is scheduled for the next period.`
  }

  if (input.lifecycleState === 'pending_upgrade') {
    return `Upgrade to ${input.pendingPlan ?? 'the selected plan'} is pending provider confirmation.`
  }

  return null
}

function statusTone(
  planId: PlanId,
  restricted: boolean
): 'danger' | 'neutral' | 'success' | 'warning' {
  if (restricted) return 'danger'
  if (isPaidPlan(planId)) return 'success'
  return 'neutral'
}

export default function OrgBillingPage() {
  const auth = useAuth()
  const organization = auth.activeOrganization?.organization ?? null
  const organizationId = organization?.id ?? null
  const role = auth.activeOrganization?.membership.role
  const billingSummary = useBillingSummary(Boolean(organizationId))
  const billing = billingSummary.data?.billing ?? null
  const portalMutation = useOpenBillingPortal()
  const membersQuery = useOrganizationMembers(organizationId)
  const [hasMounted, setHasMounted] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileForm, setProfileForm] = useState<BillingProfileForm>(emptyProfileForm)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const canManageBilling =
    hasMounted && (billing?.canManageBilling ?? (role === 'owner' || role === 'admin'))
  const historyQuery = useBillingHistory(organizationId, canManageBilling)
  const profileQuery = useBillingProfile(organizationId, canManageBilling)
  const updateProfileMutation = useUpdateBillingProfile(organizationId)
  const storedPlanId = normalizePlanId(billing?.plan ?? organization?.plan)
  const effectivePlanId = normalizePlanId(
    billing?.effectivePlan ?? billing?.plan ?? organization?.plan
  )
  const currentPlan = PLANS.find((plan) => plan.id === effectivePlanId) ?? PLANS[0]
  const storedPlan = PLANS.find((plan) => plan.id === storedPlanId) ?? currentPlan
  const seatsUsed = membersQuery.data?.members?.length ?? null
  const monthlyTotal = getMonthlySeatTotal(currentPlan, seatsUsed)
  const billingStatus = billingStatusLabel(billing?.status ?? null)
  const pendingDate = formatDate(billing?.pendingEffectiveAt ?? billing?.currentPeriodEnd ?? null)
  const graceEndsAt = formatDate(billing?.graceEndsAt ?? null)
  const lifecycleText = lifecycleMessage({
    lifecycleState: billing?.lifecycleState,
    pendingPlan: billing?.pendingPlan ?? null,
    pendingDate,
    graceEndsAt,
  })
  const shouldShowPortal =
    hasMounted &&
    canManageBilling &&
    Boolean(billing?.customerId) &&
    (isPaidPlan(storedPlanId) || billing?.status === 'past_due')

  useEffect(() => {
    const profile = profileQuery.data?.profile
    if (!profile) {
      setProfileForm((current) => ({
        ...current,
        receiptEmail: current.receiptEmail || auth.session?.user.email || '',
      }))
      return
    }

    setProfileForm({
      receiptEmail: profile.receiptEmail ?? auth.session?.user.email ?? '',
      financeEmails: profile.financeEmails.join(', '),
      businessName: profile.businessName ?? '',
      taxId: profile.taxId ?? '',
      line1: profile.address.line1 ?? '',
      line2: profile.address.line2 ?? '',
      city: profile.address.city ?? '',
      state: profile.address.state ?? '',
      postalCode: profile.address.postalCode ?? '',
      country: profile.address.country ?? '',
    })
  }, [auth.session?.user.email, profileQuery.data?.profile])

  async function handleOpenPortal() {
    setActionError(null)

    try {
      await portalMutation.mutateAsync()
    } catch (error) {
      setActionError(getApiFriendlyMessage(error, 'Unable to open the billing portal right now.'))
    }
  }

  async function handleSaveProfile() {
    setProfileMessage(null)
    setProfileError(null)

    try {
      await updateProfileMutation.mutateAsync({
        receiptEmail: toNullableString(profileForm.receiptEmail),
        financeEmails: parseFinanceEmails(profileForm.financeEmails),
        businessName: toNullableString(profileForm.businessName),
        taxId: toNullableString(profileForm.taxId),
        address: {
          line1: toNullableString(profileForm.line1),
          line2: toNullableString(profileForm.line2),
          city: toNullableString(profileForm.city),
          state: toNullableString(profileForm.state),
          postalCode: toNullableString(profileForm.postalCode),
          country: toNullableString(profileForm.country),
        },
      })
      setProfileMessage('Billing contact updated.')
    } catch (error) {
      setProfileError(getApiFriendlyMessage(error, 'Unable to update billing contact right now.'))
    }
  }

  return (
    <div className="space-y-6 p-6 pb-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="text-sm text-muted-foreground">
            Manage the active organisation&apos;s plan, seats, billing contact, and invoices.
          </p>
        </div>
        <StatusBadge tone={statusTone(effectivePlanId, Boolean(billing?.restricted))}>
          {billing?.restricted ? 'Restricted' : `${currentPlan.name} plan`}
        </StatusBadge>
      </div>

      {billing?.recoveryRequired || billing?.status === 'past_due' ? (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/45 bg-warning-muted p-4 text-warning sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Payment recovery needed</p>
              <p className="mt-1 text-xs">
                {graceEndsAt
                  ? `Paid access remains available until ${graceEndsAt}.`
                  : 'Paid access remains available during the recovery window.'}{' '}
                Update the payment method in Polar to avoid paid-feature restrictions.
              </p>
            </div>
          </div>
          {shouldShowPortal ? (
            <Button
              disabled={portalMutation.isPending}
              onClick={() => void handleOpenPortal()}
              size="sm"
              type="button"
              variant="outline"
            >
              {portalMutation.isPending ? 'Opening...' : 'Manage billing'}
            </Button>
          ) : null}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Organisation billing</CardTitle>
          <CardDescription>
            Billing is scoped to this organisation. The same user can own or pay for other
            organisations separately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg border border-border bg-background-deep p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Current effective plan
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{currentPlan.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{currentPlan.tagline}</p>
                </div>
                <div className="text-left sm:text-right">
                  {monthlyTotal === null ? (
                    <p className="text-sm font-medium">Custom pricing</p>
                  ) : monthlyTotal === 0 ? (
                    <p className="text-sm font-medium">Free</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium">
                        {formatCurrency(monthlyTotal, currentPlan.currency)} / month
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {Math.max(seatsUsed ?? 1, 1)} seats x{' '}
                        {formatCurrency(currentPlan.priceMonthly ?? 0, currentPlan.currency)}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  <span>
                    {seatsUsed === null
                      ? 'Loading seats...'
                      : `${seatsUsed} members, ${formatSeatLimit(currentPlan).toLowerCase()}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  <span>{currentPlan.limits.auditRetentionDays}-day audit retention</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-accent" />
                  <span>{billingStatus}</span>
                </div>
              </div>

              {storedPlan.id !== currentPlan.id ? (
                <p className="mt-4 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                  Stored subscription plan: {storedPlan.name}. Effective access is currently{' '}
                  {currentPlan.name} because of billing lifecycle policy.
                </p>
              ) : null}
              {lifecycleText ? (
                <p className="mt-4 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                  {lifecycleText}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-lg border border-border bg-background-deep p-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Organisation
                </p>
                <p className="mt-2 truncate text-sm font-medium text-foreground">
                  {organization?.name ?? 'No active organisation'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {role ? `Your role: ${role}` : 'Select an organisation to manage billing.'}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background-deep p-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Billing owner
                </p>
                <p className="mt-2 truncate text-sm font-medium text-foreground">
                  {auth.session?.user.name ?? 'Unknown user'}
                </p>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  {auth.session?.user.email ?? 'No email on session'}
                </p>
              </div>
            </div>
          </div>

          {!canManageBilling ? (
            <p className="rounded-md border border-border bg-background-deep px-3 py-2 text-xs text-muted-foreground">
              Only organisation owners and admins can change billing.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {canManageBilling ? (
              <Button asChild size="sm">
                <Link href={getBillingPlansPath()}>
                  {isPaidPlan(effectivePlanId) ? 'Change plan' : 'Upgrade'}
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <Button disabled size="sm" type="button">
                Owner or admin required
              </Button>
            )}
            {shouldShowPortal ? (
              <Button
                disabled={portalMutation.isPending}
                onClick={() => void handleOpenPortal()}
                size="sm"
                type="button"
                variant="outline"
              >
                {portalMutation.isPending ? 'Opening...' : 'Manage billing'}
              </Button>
            ) : null}
          </div>

          {actionError ? (
            <p className="rounded-md border border-destructive/45 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {actionError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-4 w-4 text-accent" />
              Billing contact
            </CardTitle>
            <CardDescription>
              Store receipt, finance-copy, and invoice details for this organisation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Receipt email
                <input
                  className="h-9 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
                  disabled={
                    !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
                  }
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      receiptEmail: event.target.value,
                    }))
                  }
                  placeholder={auth.session?.user.email ?? 'billing@example.com'}
                  type="email"
                  value={profileForm.receiptEmail}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Business name
                <input
                  className="h-9 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
                  disabled={
                    !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
                  }
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      businessName: event.target.value,
                    }))
                  }
                  placeholder={organization?.name ?? 'Company name'}
                  type="text"
                  value={profileForm.businessName}
                />
              </label>
            </div>

            <label className="grid gap-1 text-xs text-muted-foreground">
              Finance-copy emails
              <input
                className="h-9 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
                disabled={
                  !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
                }
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    financeEmails: event.target.value,
                  }))
                }
                placeholder="finance@example.com, manager@example.com"
                type="text"
                value={profileForm.financeEmails}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Tax ID
                <input
                  className="h-9 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
                  disabled={
                    !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
                  }
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      taxId: event.target.value,
                    }))
                  }
                  placeholder="GSTIN / VAT / Tax ID"
                  type="text"
                  value={profileForm.taxId}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Country
                <input
                  className="h-9 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
                  disabled={
                    !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
                  }
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      country: event.target.value,
                    }))
                  }
                  placeholder="IN"
                  type="text"
                  value={profileForm.country}
                />
              </label>
            </div>

            <label className="grid gap-1 text-xs text-muted-foreground">
              Billing address
              <input
                className="h-9 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
                disabled={
                  !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
                }
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    line1: event.target.value,
                  }))
                }
                placeholder="Address line 1"
                type="text"
                value={profileForm.line1}
              />
            </label>

            <input
              aria-label="Billing address line 2"
              className="h-9 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
              disabled={
                !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
              }
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  line2: event.target.value,
                }))
              }
              placeholder="Address line 2"
              type="text"
              value={profileForm.line2}
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <input
                aria-label="Billing city"
                className="h-9 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
                disabled={
                  !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
                }
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                placeholder="City"
                type="text"
                value={profileForm.city}
              />
              <input
                aria-label="Billing state"
                className="h-9 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
                disabled={
                  !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
                }
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    state: event.target.value,
                  }))
                }
                placeholder="State"
                type="text"
                value={profileForm.state}
              />
              <input
                aria-label="Billing postal code"
                className="h-9 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
                disabled={
                  !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
                }
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    postalCode: event.target.value,
                  }))
                }
                placeholder="Postal code"
                type="text"
                value={profileForm.postalCode}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={
                  !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
                }
                onClick={() => void handleSaveProfile()}
                size="sm"
                type="button"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save billing contact'}
              </Button>
              {profileQuery.data?.profile.updatedAt ? (
                <span className="text-xs text-muted-foreground">
                  Updated {formatDate(profileQuery.data.profile.updatedAt)}
                </span>
              ) : null}
            </div>

            {profileMessage ? (
              <p className="rounded-md border border-success/45 bg-success-muted px-3 py-2 text-xs text-success">
                {profileMessage}
              </p>
            ) : null}
            {profileError ? (
              <p className="rounded-md border border-destructive/45 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {profileError}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-4 w-4 text-accent" />
              Billing history
            </CardTitle>
            <CardDescription>
              Subscription changes are synced from Polar webhooks and provider reconciliation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {historyQuery.isLoading ? (
              <div className="rounded-lg border border-border bg-background-deep p-4">
                <p className="text-sm font-medium">Loading billing history...</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Fetching recent subscription events for this organisation.
                </p>
              </div>
            ) : historyQuery.data?.history.events.length ? (
              <div className="space-y-2">
                {historyQuery.data.history.events.map((event) => (
                  <div
                    className="rounded-lg border border-border bg-background-deep p-3"
                    key={event.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{historyEventLabel(event.eventType)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatPlanName(event.previousPlan)} to {formatPlanName(event.nextPlan)}
                          {event.nextSeats !== null ? `, ${event.nextSeats} seats` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(event.createdAt) ?? 'Unknown date'}
                      </span>
                    </div>
                    {event.actorUserId ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Actor: {event.actorUserId}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-background-deep p-4">
                <p className="text-sm font-medium">No billing history yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Checkout, plan-change, portal, and Polar webhook events will appear here.
                </p>
              </div>
            )}
            {shouldShowPortal ? (
              <Button
                disabled={portalMutation.isPending}
                onClick={() => void handleOpenPortal()}
                size="sm"
                type="button"
                variant="outline"
              >
                {portalMutation.isPending ? 'Opening...' : 'Open Polar invoices'}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
