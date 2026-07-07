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
import { isPaidPlan, useBillingSummary, useOpenBillingPortal } from '@/lib/hooks/use-billing'
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

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const canManageBilling =
    hasMounted && (billing?.canManageBilling ?? (role === 'owner' || role === 'admin'))
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

  async function handleOpenPortal() {
    setActionError(null)

    try {
      await portalMutation.mutateAsync()
    } catch (error) {
      setActionError(getApiFriendlyMessage(error, 'Unable to open the billing portal right now.'))
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
              Receipts currently go to the Polar checkout customer. Keep finance-copy emails in
              Polar until local invoice contacts are implemented.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border bg-background-deep p-4">
              <p className="text-xs text-muted-foreground">Primary receipt email</p>
              <p className="mt-1 break-all text-sm font-medium">
                {auth.session?.user.email ?? 'No email on session'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Future provider work should add organisation-level billing contacts, tax address, and
              finance-copy recipients without changing app-login emails.
            </p>
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
            <div className="rounded-lg border border-border bg-background-deep p-4">
              <p className="text-sm font-medium">Local billing history is being prepared</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The backend now has a billing history table. The next API pass should expose
                provider events, invoices, grants, and plan changes here.
              </p>
            </div>
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
