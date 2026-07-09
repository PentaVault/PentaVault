'use client'

import {
  ArrowRight,
  CalendarClock,
  CreditCard,
  History,
  Mail,
  Plus,
  TriangleAlert,
  Users,
  X,
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

type BillingProfileForm = {
  receiptEmail: string
  financeEmails: string[]
  financeEmailDraft: string
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
  financeEmails: [],
  financeEmailDraft: '',
  businessName: '',
  taxId: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value))
}

function formatPlanName(planId: PlanId | null): string {
  return PLANS.find((plan) => plan.id === planId)?.name ?? 'Unknown'
}

function formatSeatLimit(plan: Plan): string {
  return plan.limits.members === null ? 'unlimited seats' : `up to ${plan.limits.members} seats`
}

function formatMonthlyTotal(plan: Plan, seatsUsed: number | null): string {
  const total = getMonthlySeatTotal(plan, seatsUsed)
  if (total === null) return 'Custom pricing'
  if (total === 0) return 'Free'
  return `${formatCurrency(total, plan.currency)} / month`
}

function billingStatusLabel(status: string | null): string {
  if (status === 'active') return 'Active'
  if (status === 'trialing') return 'Trialing'
  if (status === 'past_due') return 'Past due'
  if (status === 'canceled' || status === 'cancelled' || status === 'revoked') return 'Canceled'
  return 'Not connected'
}

function historyEventLabel(eventType: string): string {
  if (eventType === 'billing.checkout.created') return 'Checkout created'
  if (eventType === 'billing.subscription.changed') return 'Subscription changed'
  if (eventType === 'billing.subscription.change_scheduled') return 'Plan change scheduled'
  if (eventType === 'billing.subscription.cancel_scheduled') return 'Cancellation scheduled'
  if (eventType === 'billing.profile.updated') return 'Billing contact updated'
  if (eventType === 'billing.portal.opened') return 'Billing portal opened'
  return eventType.replaceAll('.', ' ')
}

function lifecycleCopy(input: {
  lifecycleState: string | undefined
  pendingPlan: PlanId | null
  pendingDate: string | null
  graceEndsAt: string | null
}): string | null {
  if (input.lifecycleState === 'past_due_grace') {
    return input.graceEndsAt
      ? `Payment recovery is open until ${input.graceEndsAt}.`
      : 'Payment recovery is open.'
  }

  if (input.lifecycleState === 'past_due_restricted') {
    return 'Payment recovery expired. Paid writes are restricted.'
  }

  if (input.lifecycleState === 'pending_cancel') {
    return input.pendingDate
      ? `Cancellation is scheduled for ${input.pendingDate}.`
      : 'Cancellation is scheduled for period end.'
  }

  if (input.lifecycleState === 'pending_downgrade') {
    return input.pendingDate
      ? `Downgrade to ${formatPlanName(input.pendingPlan)} is scheduled for ${input.pendingDate}.`
      : `Downgrade to ${formatPlanName(input.pendingPlan)} is scheduled.`
  }

  if (input.lifecycleState === 'pending_upgrade') {
    return `Upgrade to ${formatPlanName(input.pendingPlan)} is pending provider confirmation.`
  }

  if (input.lifecycleState === 'pending_checkout') {
    return `Checkout for ${formatPlanName(input.pendingPlan)} is pending.`
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

function toNullableString(value: string): string | null {
  return value.trim() || null
}

function normalizeEmailInput(value: string): string {
  return value.trim().toLowerCase()
}

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function OrgBillingPage() {
  const auth = useAuth()
  const organization = auth.activeOrganization?.organization ?? null
  const organizationId = organization?.id ?? null
  const role = auth.activeOrganization?.membership.role
  const billingSummary = useBillingSummary(Boolean(organizationId))
  const billing = billingSummary.data?.billing ?? null
  const membersQuery = useOrganizationMembers(organizationId)
  const portalMutation = useOpenBillingPortal()
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
  const effectivePlanId = normalizePlanId(
    billing?.effectivePlan ?? billing?.plan ?? organization?.plan
  )
  const currentPlan = PLANS.find((plan) => plan.id === effectivePlanId) ?? PLANS[0]
  const seatsUsed = membersQuery.data?.members?.length ?? null
  const pendingDate = formatDate(billing?.pendingEffectiveAt ?? billing?.currentPeriodEnd ?? null)
  const lifecycleText = lifecycleCopy({
    lifecycleState: billing?.lifecycleState,
    pendingPlan: billing?.pendingPlan ?? null,
    pendingDate,
    graceEndsAt: formatDate(billing?.graceEndsAt ?? null),
  })
  const shouldShowPortal = hasMounted && canManageBilling && Boolean(billing?.customerId)

  useEffect(() => {
    const profile = profileQuery.data?.profile
    setProfileForm({
      receiptEmail: profile?.receiptEmail ?? auth.session?.user.email ?? '',
      financeEmails: profile?.financeEmails ?? [],
      financeEmailDraft: '',
      businessName: profile?.businessName ?? '',
      taxId: profile?.taxId ?? '',
      line1: profile?.address.line1 ?? '',
      line2: profile?.address.line2 ?? '',
      city: profile?.address.city ?? '',
      state: profile?.address.state ?? '',
      postalCode: profile?.address.postalCode ?? '',
      country: profile?.address.country ?? '',
    })
  }, [auth.session?.user.email, profileQuery.data?.profile])

  function addFinanceEmail() {
    const email = normalizeEmailInput(profileForm.financeEmailDraft)
    if (!email) return

    if (!isLikelyEmail(email)) {
      setProfileError('Enter a valid finance email.')
      return
    }

    setProfileError(null)
    setProfileForm((current) => ({
      ...current,
      financeEmails: current.financeEmails.includes(email)
        ? current.financeEmails
        : [...current.financeEmails, email],
      financeEmailDraft: '',
    }))
  }

  function removeFinanceEmail(email: string) {
    setProfileForm((current) => ({
      ...current,
      financeEmails: current.financeEmails.filter((entry) => entry !== email),
    }))
  }

  async function handleOpenPortal() {
    setActionError(null)

    try {
      await portalMutation.mutateAsync()
    } catch (error) {
      setActionError(getApiFriendlyMessage(error, 'Unable to open billing right now.'))
    }
  }

  async function handleSaveProfile() {
    setProfileMessage(null)
    setProfileError(null)

    try {
      await updateProfileMutation.mutateAsync({
        receiptEmail: toNullableString(profileForm.receiptEmail),
        financeEmails: profileForm.financeEmails,
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
      setProfileMessage('Billing contact saved.')
    } catch (error) {
      setProfileError(getApiFriendlyMessage(error, 'Unable to update billing contact.'))
    }
  }

  return (
    <div className="space-y-5 p-6 pb-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="text-sm text-muted-foreground">
            Plan, seats, contact, and recent billing events for this organisation.
          </p>
        </div>
        <StatusBadge tone={statusTone(effectivePlanId, Boolean(billing?.restricted))}>
          {billing?.restricted ? 'Restricted' : `${currentPlan.name} plan`}
        </StatusBadge>
      </div>

      {billing?.recoveryRequired || billing?.restricted || lifecycleText ? (
        <div className="flex items-start gap-3 rounded-lg border border-warning/45 bg-warning-muted p-4 text-warning">
          <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{lifecycleText ?? 'Payment recovery needs attention.'}</p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg">Current plan</CardTitle>
              <CardDescription>{organization?.name ?? 'No active organisation'}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManageBilling ? (
                <Button asChild size="sm">
                  <Link href={getBillingPlansPath()}>
                    Change plan
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-background-deep p-4">
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="mt-1 text-lg font-semibold">{currentPlan.name}</p>
            </div>
            <div className="rounded-lg border border-border bg-background-deep p-4">
              <p className="text-xs text-muted-foreground">Monthly estimate</p>
              <p className="mt-1 text-lg font-semibold">
                {formatMonthlyTotal(currentPlan, seatsUsed)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background-deep p-4">
              <p className="text-xs text-muted-foreground">Seats</p>
              <p className="mt-1 text-sm font-medium">
                {seatsUsed === null
                  ? 'Loading...'
                  : `${seatsUsed} active, ${formatSeatLimit(currentPlan)}`}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background-deep p-4">
              <p className="text-xs text-muted-foreground">Provider status</p>
              <p className="mt-1 text-sm font-medium">
                {billingStatusLabel(billing?.status ?? null)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              {currentPlan.limits.members === null
                ? 'Unlimited members'
                : `${currentPlan.limits.members} member limit`}
            </span>
            <span className="flex items-center gap-2">
              <History className="h-4 w-4 text-accent" />
              {currentPlan.limits.auditRetentionDays}-day audit retention
            </span>
            <span className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-accent" />
              {pendingDate ?? formatDate(billing?.currentPeriodEnd ?? null) ?? 'No renewal date'}
            </span>
          </div>

          {actionError ? (
            <p className="rounded-md border border-destructive/45 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {actionError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-4 w-4 text-accent" />
              Polar customer profile
            </CardTitle>
            <CardDescription>Receipts, tax details, and finance contacts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Receipt email
                <input
                  className="h-10 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
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
                  className="h-10 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
                  disabled={
                    !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
                  }
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      businessName: event.target.value,
                    }))
                  }
                  placeholder={organization?.name ?? 'Company'}
                  type="text"
                  value={profileForm.businessName}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-muted-foreground">
                GST / VAT / Tax ID
                <input
                  className="h-10 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
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
                  className="h-10 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
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

            <div className="space-y-2">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Finance emails
                <div className="flex gap-2">
                  <input
                    className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
                    disabled={
                      !canManageBilling ||
                      profileQuery.isLoading ||
                      updateProfileMutation.isPending ||
                      profileForm.financeEmails.length >= 5
                    }
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        financeEmailDraft: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addFinanceEmail()
                      }
                    }}
                    placeholder="finance@example.com"
                    type="email"
                    value={profileForm.financeEmailDraft}
                  />
                  <Button
                    aria-label="Add finance email"
                    disabled={
                      !canManageBilling ||
                      profileQuery.isLoading ||
                      updateProfileMutation.isPending ||
                      profileForm.financeEmails.length >= 5 ||
                      !profileForm.financeEmailDraft.trim()
                    }
                    onClick={addFinanceEmail}
                    className="h-10 w-10 shrink-0 p-0"
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </label>
              <div className="flex min-h-9 flex-wrap gap-2">
                {profileForm.financeEmails.length ? (
                  profileForm.financeEmails.map((email) => (
                    <span
                      className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-background-deep px-2 py-1 text-xs text-foreground"
                      key={email}
                    >
                      <span className="truncate">{email}</span>
                      <button
                        aria-label={`Remove ${email}`}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        disabled={!canManageBilling || updateProfileMutation.isPending}
                        onClick={() => removeFinanceEmail(email)}
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No finance emails added.</span>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-muted-foreground sm:col-span-2">
                Address line 1
                <input
                  className="h-10 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
                  disabled={
                    !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
                  }
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, line1: event.target.value }))
                  }
                  placeholder="Street address"
                  type="text"
                  value={profileForm.line1}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground sm:col-span-2">
                Address line 2
                <input
                  className="h-10 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
                  disabled={
                    !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
                  }
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, line2: event.target.value }))
                  }
                  placeholder="Apartment, suite, floor"
                  type="text"
                  value={profileForm.line2}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                City
                <input
                  className="h-10 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
                  disabled={
                    !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
                  }
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, city: event.target.value }))
                  }
                  placeholder="City"
                  type="text"
                  value={profileForm.city}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                State / region
                <input
                  className="h-10 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
                  disabled={
                    !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
                  }
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, state: event.target.value }))
                  }
                  placeholder="State"
                  type="text"
                  value={profileForm.state}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Postal code
                <input
                  className="h-10 rounded-md border border-border bg-background-deep px-3 text-sm text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring"
                  disabled={
                    !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
                  }
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, postalCode: event.target.value }))
                  }
                  placeholder="Postal code"
                  type="text"
                  value={profileForm.postalCode}
                />
              </label>
            </div>

            <Button
              disabled={
                !canManageBilling || profileQuery.isLoading || updateProfileMutation.isPending
              }
              onClick={() => void handleSaveProfile()}
              size="sm"
              type="button"
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save profile'}
            </Button>
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
              <CreditCard className="h-4 w-4 text-accent" />
              Recent billing activity
            </CardTitle>
            <CardDescription>Checkout, subscription, and profile changes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {historyQuery.isLoading ? (
              <p className="rounded-lg border border-border bg-background-deep p-4 text-sm">
                Loading billing history...
              </p>
            ) : historyQuery.data?.history.events.length ? (
              historyQuery.data.history.events.slice(0, 5).map((event) => (
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
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-border bg-background-deep p-4 text-sm">
                No billing activity yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
