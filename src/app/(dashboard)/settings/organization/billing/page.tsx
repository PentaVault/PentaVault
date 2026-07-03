'use client'

import { Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PLANS, type PlanId } from '@/lib/billing/plans'
import { useAuth } from '@/lib/hooks/use-auth'
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

function isPlanId(value: string | undefined): value is PlanId {
  return value === 'free' || value === 'pro' || value === 'team'
}

export default function OrgBillingPage() {
  const auth = useAuth()
  const organizationId = auth.activeOrganization?.organization.id ?? null
  const role = auth.activeOrganization?.membership.role
  const canManageBilling = role === 'owner' || role === 'admin'
  const membersQuery = useOrganizationMembers(organizationId)

  // Plan comes from the org record (exposed via listOrganizations); a missing
  // or unknown value falls back to free (deny-by-default). Seats = live members.
  const planFromOrg = auth.activeOrganization?.organization.plan
  const currentPlanId: PlanId = isPlanId(planFromOrg) ? planFromOrg : 'free'
  const currentPlan = PLANS.find((plan) => plan.id === currentPlanId) ?? PLANS[0]
  const seatsUsed = membersQuery.data?.members?.length ?? null
  const seatLimit = currentPlan.limits.members
  // Per-seat pricing: the org's bill is the per-member price × seats in use.
  const monthlyTotal =
    currentPlan.priceMonthly === null || currentPlan.priceMonthly === 0
      ? currentPlan.priceMonthly
      : currentPlan.priceMonthly * (seatsUsed ?? 0)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="text-sm text-muted-foreground">
          Manage your organisation&apos;s subscription and seats.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>Your organisation is on the {currentPlan.name} plan.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
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
                  {seatsUsed} {seatsUsed === 1 ? 'seat' : 'seats'} ×{' '}
                  {formatCurrency(currentPlan.priceMonthly ?? 0, currentPlan.currency)}
                </p>
              </>
            )}
            {seatLimit !== null && seatsUsed !== null && seatsUsed >= seatLimit ? (
              <p className="mt-1 text-xs text-warning">Seat limit reached — upgrade to add more.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Plans</h3>
        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId
            return (
              <Card
                className={cn(
                  'relative flex flex-col',
                  plan.highlighted && !isCurrent && 'border-accent'
                )}
                key={plan.id}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    {isCurrent ? (
                      <span className="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                        Current
                      </span>
                    ) : null}
                  </div>
                  <CardDescription>{plan.tagline}</CardDescription>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-semibold">
                      {formatPrice(plan.priceMonthly, plan.currency)}
                    </span>
                    <span className="text-xs text-muted-foreground">{plan.priceUnit}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{plan.seatBand}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="flex-1 space-y-2">
                    {plan.features.map((feature) => (
                      <li
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                        key={feature}
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-5"
                    disabled={isCurrent || !canManageBilling}
                    size="sm"
                    type="button"
                    variant={plan.highlighted ? 'default' : 'outline'}
                  >
                    {isCurrent ? 'Current plan' : `Upgrade to ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {canManageBilling
          ? 'Checkout is being wired up. Plan changes will be available here soon.'
          : 'Only organisation owners and admins can change the billing plan.'}
      </p>
    </div>
  )
}
