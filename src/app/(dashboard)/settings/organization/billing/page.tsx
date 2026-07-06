'use client'

import { ArrowRight, Check, CreditCard, ShieldCheck, TriangleAlert, Users } from 'lucide-react'
import Link from 'next/link'

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
import { isPaidPlan, useBillingSummary, useOpenBillingPortal } from '@/lib/hooks/use-billing'
import { useOrganizationMembers } from '@/lib/hooks/use-team'
import { cn } from '@/lib/utils/cn'

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatPrice(priceMonthly: number | null, currency: string): string {
  if (priceMonthly === null) return 'Custom'
  return formatCurrency(priceMonthly, currency)
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

function PlanFeatureList({ plan, limit = 4 }: { plan: Plan; limit?: number }) {
  return (
    <ul className="space-y-2">
      {plan.features.slice(0, limit).map((feature) => (
        <li className="flex items-start gap-2 text-xs text-muted-foreground" key={feature}>
          <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  )
}

export default function OrgBillingPage() {
  const auth = useAuth()
  const organization = auth.activeOrganization?.organization ?? null
  const organizationId = organization?.id ?? null
  const role = auth.activeOrganization?.membership.role
  const billingSummary = useBillingSummary(Boolean(organizationId))
  const billing = billingSummary.data?.billing ?? null
  const portalMutation = useOpenBillingPortal()
  const canManageBilling = billing?.canManageBilling ?? (role === 'owner' || role === 'admin')
  const membersQuery = useOrganizationMembers(organizationId)

  const currentPlanId = normalizePlanId(billing?.plan ?? organization?.plan)
  const currentPlan = PLANS.find((plan) => plan.id === currentPlanId) ?? PLANS[0]
  const upgradeOptions = getHigherPlans(currentPlanId)
  const seatsUsed = membersQuery.data?.members?.length ?? null
  const seatLimit = currentPlan.limits.members
  const monthlyTotal = getMonthlySeatTotal(currentPlan, seatsUsed)
  const billingStatus = billingStatusLabel(billing?.status ?? null)
  const pendingDate = formatDate(billing?.pendingEffectiveAt ?? billing?.currentPeriodEnd ?? null)
  const shouldShowPortal =
    canManageBilling &&
    Boolean(billing?.customerId) &&
    (isPaidPlan(currentPlanId) || billing?.status === 'past_due')

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="text-sm text-muted-foreground">
            Review your organisation&apos;s plan, seat usage, and available upgrades.
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
              disabled={portalMutation.isPending}
              onClick={() => portalMutation.mutate()}
              size="sm"
              type="button"
              variant="outline"
            >
              {portalMutation.isPending ? 'Opening...' : 'Manage billing'}
            </Button>
          ) : null}
        </div>
      ) : null}

      <Card className="border-sapphire/35 bg-sapphire-muted/40">
        <CardHeader>
          <CardTitle className="text-base">Sandbox payment notes</CardTitle>
          <CardDescription>
            Checkout is created with Polar. Polar may show Stripe messaging because Stripe is
            Polar&apos;s card processor, not because PentaVault is using a separate Stripe checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
          <div className="rounded-lg border border-border bg-background-deep p-3">
            <p className="font-medium text-foreground">Use test cards only</p>
            <p className="mt-1">
              In sandbox mode, enter Stripe test card 4242 4242 4242 4242 with any future expiry and
              CVC.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background-deep p-3">
            <p className="font-medium text-foreground">Do not use real cards</p>
            <p className="mt-1">
              A real card in sandbox checkout is rejected with a test-mode card error.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background-deep p-3">
            <p className="font-medium text-foreground">UPI status</p>
            <p className="mt-1">
              UPI is shown as unavailable until Polar exposes it in hosted checkout.
            </p>
          </div>
        </CardContent>
      </Card>

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
                disabled={portalMutation.isPending}
                onClick={() => portalMutation.mutate()}
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

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Available upgrades</h3>
            <p className="text-xs text-muted-foreground">
              Only plans above your current tier are shown here.
            </p>
          </div>
          {!canManageBilling ? (
            <p className="text-xs text-muted-foreground">
              Only organisation owners and admins can change billing.
            </p>
          ) : null}
        </div>

        {upgradeOptions.length > 0 ? (
          <div
            className={cn(
              'grid gap-4',
              upgradeOptions.length === 1 ? 'lg:grid-cols-1' : 'lg:grid-cols-2'
            )}
          >
            {upgradeOptions.map((plan) => {
              const estimatedTotal = getMonthlySeatTotal(plan, seatsUsed)
              return (
                <Card
                  className={cn('relative flex flex-col', plan.highlighted && 'border-accent')}
                  key={plan.id}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        <CardDescription>{plan.tagline}</CardDescription>
                      </div>
                      {plan.highlighted ? <StatusBadge tone="success">Popular</StatusBadge> : null}
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-2xl font-semibold">
                        {formatPrice(plan.priceMonthly, plan.currency)}
                      </span>
                      <span className="text-xs text-muted-foreground">{plan.priceUnit}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.seatBand}</p>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <PlanFeatureList plan={plan} />
                    <div className="mt-5 rounded-lg border border-border bg-background-deep p-3 text-xs text-muted-foreground">
                      {estimatedTotal === null
                        ? 'Custom pricing is handled with the sales team.'
                        : `Estimated total: ${formatCurrency(
                            estimatedTotal,
                            plan.currency
                          )} / month for ${Math.max(seatsUsed ?? 1, 1)} seats.`}
                    </div>
                    {canManageBilling ? (
                      <Button asChild className="mt-5" size="sm" variant="default">
                        <Link href={getBillingUpgradePath(plan.id)}>
                          Upgrade
                          <ArrowRight className="ml-2 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    ) : (
                      <Button className="mt-5" disabled size="sm" type="button" variant="outline">
                        Upgrade
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">No higher-tier plan is available.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your organisation is already on the highest published plan.
                  </p>
                </div>
                <StatusBadge tone="success">Fully upgraded</StatusBadge>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
