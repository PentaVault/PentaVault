'use client'

import { ArrowRight, CreditCard, ShieldCheck, TriangleAlert, Users } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getBillingUpgradePath,
  getHigherPlans,
  getMonthlySeatTotal,
  normalizePlanId,
} from '@/lib/billing/plan-utils'
import { PLANS, type Plan } from '@/lib/billing/plans'
import { useAuth } from '@/lib/hooks/use-auth'
import {
  isPaidPlan,
  useBillingSummary,
  useChangeBillingPlan,
  useOpenBillingPortal,
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

export default function OrgBillingPage() {
  const auth = useAuth()
  const organization = auth.activeOrganization?.organization ?? null
  const organizationId = organization?.id ?? null
  const role = auth.activeOrganization?.membership.role
  const billingSummary = useBillingSummary(Boolean(organizationId))
  const billing = billingSummary.data?.billing ?? null
  const portalMutation = useOpenBillingPortal()
  const changePlanMutation = useChangeBillingPlan()
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const canManageBilling = billing?.canManageBilling ?? (role === 'owner' || role === 'admin')
  const membersQuery = useOrganizationMembers(organizationId)

  const currentPlanId = normalizePlanId(billing?.plan ?? organization?.plan)
  const currentPlan = PLANS.find((plan) => plan.id === currentPlanId) ?? PLANS[0]
  const upgradeOptions = getHigherPlans(currentPlanId)
  const nextUpgrade = upgradeOptions[0] ?? null
  const seatsUsed = membersQuery.data?.members?.length ?? null
  const billableSeats = Math.max(seatsUsed ?? 1, 1)
  const seatLimit = currentPlan.limits.members
  const monthlyTotal = getMonthlySeatTotal(currentPlan, seatsUsed)
  const billingStatus = billingStatusLabel(billing?.status ?? null)
  const pendingDate = formatDate(billing?.pendingEffectiveAt ?? billing?.currentPeriodEnd ?? null)
  const shouldShowPortal =
    canManageBilling &&
    Boolean(billing?.customerId) &&
    (isPaidPlan(currentPlanId) || billing?.status === 'past_due')
  const isBillingActionPending = portalMutation.isPending || changePlanMutation.isPending
  const canDowngradeToPro = currentPlanId === 'team' && billableSeats <= 15

  async function handleOpenPortal() {
    setActionError(null)
    setActionMessage(null)
    try {
      await portalMutation.mutateAsync()
    } catch (error) {
      setActionError(getApiFriendlyMessage(error, 'Unable to open the billing portal right now.'))
    }
  }

  async function handlePlanChange(planId: 'free' | 'pro') {
    setActionError(null)
    setActionMessage(null)
    try {
      const payload = planId === 'free' ? { planId } : { planId, seats: billableSeats }
      const response = await changePlanMutation.mutateAsync(payload)
      setActionMessage(response.change.message)
    } catch (error) {
      setActionError(getApiFriendlyMessage(error, 'Unable to update billing right now.'))
    }
  }

  return (
    <div className="space-y-6 p-6 pb-14">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="text-sm text-muted-foreground">
            Review your organisation&apos;s plan, seat usage, and subscription actions.
          </p>
        </div>
        <StatusBadge tone={upgradeOptions.length > 0 ? 'neutral' : 'success'}>
          {currentPlan.name} plan
        </StatusBadge>
      </div>

      {billing?.status === 'past_due' ? (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/45 bg-warning-muted p-4 text-warning sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Payment recovery needed</p>
              <p className="mt-1 text-xs">
                Paid access remains available during Polar&apos;s retry window. Update the payment
                method in the customer portal to avoid losing paid features.
              </p>
            </div>
          </div>
          {shouldShowPortal ? (
            <Button
              disabled={isBillingActionPending}
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

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account and organisation</CardTitle>
            <CardDescription>Billing is tied to the active organisation.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background-deep p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Signed in as
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {auth.session?.user.name ?? 'Unknown user'}
              </p>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {auth.session?.user.email ?? 'No email on session'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background-deep p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Organisation
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {organization?.name ?? 'No active organisation'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {role ? `Your role: ${role}` : 'Select an organisation to manage billing.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current plan</CardTitle>
            <CardDescription>
              {currentPlan.tagline} Billing status: {billingStatus}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{currentPlan.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {seatsUsed === null
                    ? 'Loading seat usage...'
                    : seatLimit === null
                      ? `${seatsUsed} members`
                      : `${seatsUsed} of ${seatLimit} seats used`}
                </p>
              </div>
              <div className="text-right">
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
            <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                <span>{formatSeatLimit(currentPlan)}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span>{currentPlan.limits.auditRetentionDays}-day audit retention</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-accent" />
                <span>{currentPlan.seatBand}</span>
              </div>
            </div>
            {billing?.pendingPlan ? (
              <p className="rounded-md border border-border bg-background-deep px-3 py-2 text-xs text-muted-foreground">
                Pending change: {billing.pendingPlan === 'free' ? 'Free' : billing.pendingPlan}{' '}
                {pendingDate ? `on ${pendingDate}` : 'after Polar confirms the update'}.
              </p>
            ) : null}
            {billing?.cancelAtPeriodEnd ? (
              <p className="rounded-md border border-warning/45 bg-warning-muted px-3 py-2 text-xs text-warning">
                Cancellation is scheduled at period end. Paid access remains available until the
                current paid period ends.
              </p>
            ) : null}
            {seatLimit !== null && seatsUsed !== null && seatsUsed >= seatLimit ? (
              <p className="rounded-md border border-warning/45 bg-warning-muted px-3 py-2 text-xs text-warning">
                Seat limit reached. Upgrade to add more members.
              </p>
            ) : null}
            {shouldShowPortal ? (
              <Button
                disabled={isBillingActionPending}
                onClick={() => void handleOpenPortal()}
                size="sm"
                type="button"
                variant="outline"
              >
                {portalMutation.isPending ? 'Opening portal...' : 'Manage billing'}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing actions</CardTitle>
          <CardDescription>
            Upgrade, downgrade, cancel, or open Polar for invoices and payment method changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canManageBilling ? (
            <p className="rounded-md border border-border bg-background-deep px-3 py-2 text-xs text-muted-foreground">
              Only organisation owners and admins can change billing.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {nextUpgrade ? (
              canManageBilling ? (
                <Button asChild size="sm">
                  <Link href={getBillingUpgradePath(nextUpgrade.id)}>
                    Upgrade to {nextUpgrade.name}
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : (
                <Button disabled size="sm" type="button">
                  Upgrade to {nextUpgrade.name}
                </Button>
              )
            ) : null}

            {currentPlanId === 'team' ? (
              <Button
                disabled={!canManageBilling || !canDowngradeToPro || isBillingActionPending}
                onClick={() => void handlePlanChange('pro')}
                size="sm"
                type="button"
                variant="outline"
              >
                {changePlanMutation.isPending ? 'Updating...' : 'Downgrade to Pro'}
              </Button>
            ) : null}

            {isPaidPlan(currentPlanId) ? (
              <Button
                disabled={!canManageBilling || isBillingActionPending || billing?.cancelAtPeriodEnd}
                onClick={() => void handlePlanChange('free')}
                size="sm"
                type="button"
                variant="outline"
              >
                {changePlanMutation.isPending ? 'Updating...' : 'Cancel subscription'}
              </Button>
            ) : null}

            {shouldShowPortal ? (
              <Button
                disabled={!canManageBilling || isBillingActionPending}
                onClick={() => void handleOpenPortal()}
                size="sm"
                type="button"
                variant="outline"
              >
                {portalMutation.isPending ? 'Opening...' : 'Manage billing'}
              </Button>
            ) : null}
          </div>

          {currentPlanId === 'team' && !canDowngradeToPro ? (
            <p className="text-xs text-warning">
              Remove members until the organisation has 15 or fewer seats before downgrading to Pro.
            </p>
          ) : null}
          {actionMessage ? (
            <p className="rounded-md border border-success/45 bg-success-muted px-3 py-2 text-xs text-success">
              {actionMessage}
            </p>
          ) : null}
          {actionError ? (
            <p className="rounded-md border border-destructive/45 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {actionError}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
