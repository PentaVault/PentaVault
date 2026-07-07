'use client'

import { ArrowLeft, Check, CreditCard, ShieldCheck, Users } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getMonthlySeatTotal,
  isHigherPlan,
  isPlanId,
  normalizePlanId,
} from '@/lib/billing/plan-utils'
import { PLANS, type Plan } from '@/lib/billing/plans'
import {
  SETTINGS_ORGANIZATION_BILLING_PATH,
  SETTINGS_ORGANIZATION_BILLING_PLANS_PATH,
} from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import {
  isPaidPlan,
  useBillingSummary,
  useChangeBillingPlan,
  useCreateBillingCheckout,
} from '@/lib/hooks/use-billing'
import { useOrganizationMembers } from '@/lib/hooks/use-team'

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

function formatLimit(plan: Plan): string {
  return plan.limits.members === null ? 'Unlimited members' : `${plan.limits.members} members`
}

function getActionError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { error?: string } } }).response?.data
    if (data?.error) return data.error
  }

  return error instanceof Error ? error.message : 'Billing request failed. Try again.'
}

export default function BillingUpgradePage() {
  const params = useParams<{ planId?: string }>()
  const router = useRouter()
  const targetPlanId = isPlanId(params.planId) ? params.planId : null
  const targetPlan = targetPlanId ? PLANS.find((plan) => plan.id === targetPlanId) : null

  const auth = useAuth()
  const organization = auth.activeOrganization?.organization ?? null
  const organizationId = organization?.id ?? null
  const role = auth.activeOrganization?.membership.role
  const membersQuery = useOrganizationMembers(organizationId)
  const billingSummary = useBillingSummary(Boolean(organizationId))
  const checkoutMutation = useCreateBillingCheckout()
  const changePlanMutation = useChangeBillingPlan()
  const [actionError, setActionError] = useState<string | null>(null)
  const [hasMounted, setHasMounted] = useState(false)

  const currentPlanId = normalizePlanId(billingSummary.data?.billing.plan ?? organization?.plan)
  const currentPlan = PLANS.find((plan) => plan.id === currentPlanId) ?? PLANS[0]
  const isAvailableUpgrade = targetPlanId ? isHigherPlan(currentPlanId, targetPlanId) : false
  const seatsUsed = membersQuery.data?.members?.length ?? null
  const billableSeats = Math.max(seatsUsed ?? 1, 1)
  const estimatedTotal = targetPlan ? getMonthlySeatTotal(targetPlan, seatsUsed) : null
  const isSubmitting = checkoutMutation.isPending || changePlanMutation.isPending
  const canManageBilling =
    billingSummary.data?.billing.canManageBilling ?? (role === 'owner' || role === 'admin')
  const canSubmit = hasMounted && isAvailableUpgrade && canManageBilling && !isSubmitting

  useEffect(() => {
    setHasMounted(true)
  }, [])

  async function handleContinueToCheckout() {
    if (!targetPlanId || !isPaidPlan(targetPlanId)) {
      return
    }

    setActionError(null)

    try {
      if (!isPaidPlan(currentPlanId)) {
        const response = await checkoutMutation.mutateAsync({
          planId: targetPlanId,
          seats: billableSeats,
        })
        window.location.assign(response.checkout.url)
        return
      }

      await changePlanMutation.mutateAsync({
        planId: targetPlanId,
        seats: billableSeats,
      })
      router.replace(SETTINGS_ORGANIZATION_BILLING_PATH)
    } catch (error) {
      setActionError(getActionError(error))
    }
  }

  if (!targetPlan || !targetPlanId) {
    return (
      <div className="space-y-6 p-6">
        <Button asChild size="sm" variant="ghost">
          <Link href={SETTINGS_ORGANIZATION_BILLING_PATH}>
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Back to billing
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plan not found</CardTitle>
            <CardDescription>The requested billing plan is not available.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href={SETTINGS_ORGANIZATION_BILLING_PLANS_PATH}>Choose a plan</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button asChild size="sm" variant="ghost">
            <Link href={SETTINGS_ORGANIZATION_BILLING_PATH}>
              <ArrowLeft className="mr-2 h-3.5 w-3.5" />
              Back to billing
            </Link>
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Upgrade to {targetPlan.name}</h2>
            <p className="text-sm text-muted-foreground">
              Review pricing and organisation details before continuing.
            </p>
          </div>
        </div>
        <StatusBadge tone={isAvailableUpgrade ? 'success' : 'warning'}>
          {isAvailableUpgrade ? 'Upgrade available' : 'Not a higher tier'}
        </StatusBadge>
      </div>

      {!isAvailableUpgrade ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">This upgrade is not available</CardTitle>
            <CardDescription>
              {targetPlan.id === currentPlan.id
                ? `Your organisation is already on ${targetPlan.name}.`
                : `${targetPlan.name} is below your current ${currentPlan.name} plan.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href={SETTINGS_ORGANIZATION_BILLING_PLANS_PATH}>Choose a plan</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Billing details</CardTitle>
            <CardDescription>These details come from your active session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                User
              </p>
              <p className="mt-2 text-sm font-medium">
                {auth.session?.user.name ?? 'Unknown user'}
              </p>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {auth.session?.user.email ?? 'No email on session'}
              </p>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Organisation
              </p>
              <p className="mt-2 text-sm font-medium">
                {organization?.name ?? 'No active organisation'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {role ? `Your role: ${role}` : 'No role found'}
              </p>
            </div>
            <div className="grid gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                <span>
                  {seatsUsed === null ? 'Loading members...' : `${seatsUsed} active members`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span>Current plan: {currentPlan.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-accent" />
                <span>Target plan: {targetPlan.name}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/45">
          <CardHeader>
            <CardTitle className="text-lg">{targetPlan.name} pricing</CardTitle>
            <CardDescription>{targetPlan.tagline}</CardDescription>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <span className="text-3xl font-semibold">
                {formatPrice(targetPlan.priceMonthly, targetPlan.currency)}
              </span>
              <span className="pb-1 text-xs text-muted-foreground">{targetPlan.priceUnit}</span>
            </div>
            <p className="text-xs text-muted-foreground">{targetPlan.seatBand}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-border bg-background-deep p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Estimated monthly total
              </p>
              <p className="mt-2 text-lg font-semibold">
                {estimatedTotal === null
                  ? 'Custom'
                  : `${formatCurrency(estimatedTotal, targetPlan.currency)} / month`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {targetPlan.priceMonthly === null
                  ? 'Custom pricing will be confirmed before checkout.'
                  : `${billableSeats} seats x ${formatCurrency(
                      targetPlan.priceMonthly,
                      targetPlan.currency
                    )}.`}
              </p>
            </div>

            {!isPaidPlan(currentPlanId) ? (
              <div className="rounded-lg border border-border bg-background-deep p-4">
                <p className="text-sm font-medium">Payment method</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PentaVault creates a Polar checkout session. Stripe may appear inside that
                  checkout because Polar uses Stripe for card processing.
                </p>
                <div className="mt-4 rounded-lg border border-accent bg-accent-muted p-3 text-left">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <CreditCard className="h-4 w-4 text-accent" />
                    Card via Polar
                  </span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    Sandbox accepts test cards only. Use 4242 4242 4242 4242, any future expiry, and
                    any CVC. Other local payment methods are intentionally hidden until the provider
                    migration is ready.
                  </span>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-background-deep p-3">
                <p className="text-xs text-muted-foreground">Members</p>
                <p className="mt-1 text-sm font-medium">{formatLimit(targetPlan)}</p>
              </div>
              <div className="rounded-lg border border-border bg-background-deep p-3">
                <p className="text-xs text-muted-foreground">Environments</p>
                <p className="mt-1 text-sm font-medium">
                  {targetPlan.limits.environmentsPerProject === null
                    ? 'Unlimited'
                    : `${targetPlan.limits.environmentsPerProject} per project`}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background-deep p-3">
                <p className="text-xs text-muted-foreground">Audit logs</p>
                <p className="mt-1 text-sm font-medium">
                  {targetPlan.limits.auditRetentionDays} days
                </p>
              </div>
            </div>

            <ul className="grid gap-2 sm:grid-cols-2">
              {targetPlan.features.map((feature) => (
                <li className="flex items-start gap-2 text-xs text-muted-foreground" key={feature}>
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-lg border border-border bg-background-deep p-4">
              <p className="text-sm font-medium">Checkout status</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isPaidPlan(currentPlanId)
                  ? 'This change is sent to Polar and applies immediately when Polar accepts the subscription update. Any prorated adjustment is included on the next invoice.'
                  : 'You will be redirected to Polar sandbox checkout to complete the subscription.'}
              </p>
              {changePlanMutation.isSuccess ? (
                <p className="mt-3 rounded-md border border-success/45 bg-success-muted px-3 py-2 text-xs text-success">
                  {changePlanMutation.data.change.message}
                </p>
              ) : null}
              {actionError ? (
                <p className="mt-3 rounded-md border border-destructive/45 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {actionError}
                </p>
              ) : null}
              <Button
                className="mt-4"
                disabled={!canSubmit}
                onClick={handleContinueToCheckout}
                size="sm"
                type="button"
              >
                {!hasMounted
                  ? 'Loading billing...'
                  : canManageBilling
                    ? isSubmitting
                      ? 'Working...'
                      : isPaidPlan(currentPlanId)
                        ? 'Upgrade with Polar'
                        : 'Continue to Polar checkout'
                    : 'Owner or admin required'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
