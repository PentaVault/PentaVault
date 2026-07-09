'use client'

import { ArrowLeft, Check, CreditCard, Info, ShieldCheck, Users } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getMonthlySeatTotal,
  getPlanChangeBlockedReason,
  getPlanChangeKind,
  getPlanRank,
  getSelectablePlans,
  normalizePlanId,
} from '@/lib/billing/plan-utils'
import type { Plan, PlanId } from '@/lib/billing/plans'
import { SETTINGS_ORGANIZATION_BILLING_PATH } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import {
  isPaidPlan,
  useBillingSummary,
  useChangeBillingPlan,
  useCreateBillingCheckout,
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

function formatPrice(plan: Plan): string {
  if (plan.priceMonthly === null) return 'Custom'
  if (plan.priceMonthly === 0) return 'Free'
  return formatCurrency(plan.priceMonthly, plan.currency)
}

function formatLimit(plan: Plan): string {
  return plan.limits.members === null ? 'Unlimited members' : `${plan.limits.members} members`
}

function actionLabel(input: {
  currentPlanId: PlanId
  targetPlanId: PlanId
  isPending: boolean
}): string {
  if (input.isPending) return 'Working...'
  const kind = getPlanChangeKind(input.currentPlanId, input.targetPlanId)

  if (kind === 'current') return 'Current plan'
  if (kind === 'cancel') return 'Cancel at period end'
  if (kind === 'checkout') return 'Continue to checkout'
  if (kind === 'upgrade') return 'Upgrade now'
  return 'Schedule downgrade'
}

function confirmPlanChange(input: { currentPlanId: PlanId; targetPlanId: PlanId }): boolean {
  const kind = getPlanChangeKind(input.currentPlanId, input.targetPlanId)

  if (kind === 'cancel') {
    return window.confirm(
      'Cancel this subscription at period end? Paid access stays active until the current period ends.'
    )
  }

  if (kind === 'downgrade') {
    return window.confirm(
      'Schedule this downgrade for the next billing period? Current paid access stays active until then.'
    )
  }

  return true
}

function planTone(planId: PlanId, currentPlanId: PlanId): 'neutral' | 'success' | 'warning' {
  if (planId === currentPlanId) return 'success'
  if (getPlanRank(planId) > getPlanRank(currentPlanId)) return 'neutral'
  return 'warning'
}

export default function BillingPlansPage() {
  const router = useRouter()
  const auth = useAuth()
  const organization = auth.activeOrganization?.organization ?? null
  const organizationId = organization?.id ?? null
  const role = auth.activeOrganization?.membership.role
  const membersQuery = useOrganizationMembers(organizationId)
  const billingSummary = useBillingSummary(Boolean(organizationId))
  const checkoutMutation = useCreateBillingCheckout()
  const changePlanMutation = useChangeBillingPlan()
  const [hasMounted, setHasMounted] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [activePlanAction, setActivePlanAction] = useState<PlanId | null>(null)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const billing = billingSummary.data?.billing ?? null
  const currentPlanId = normalizePlanId(
    billing?.effectivePlan ?? billing?.plan ?? organization?.plan
  )
  const seatsUsed = membersQuery.data?.members?.length ?? null
  const billableSeats = Math.max(seatsUsed ?? 1, 1)
  const canManageBilling =
    hasMounted && (billing?.canManageBilling ?? (role === 'owner' || role === 'admin'))
  const isSubmitting = checkoutMutation.isPending || changePlanMutation.isPending

  async function handleSelectPlan(targetPlanId: PlanId) {
    const blockedReason = getPlanChangeBlockedReason({
      canManageBilling,
      currentPlanId,
      targetPlanId,
      seatsUsed,
      lifecycleState: billing?.lifecycleState ?? null,
    })

    if (blockedReason) {
      setActionError(blockedReason)
      return
    }

    if (!confirmPlanChange({ currentPlanId, targetPlanId })) {
      return
    }

    setActionError(null)
    setActionMessage(null)
    setActivePlanAction(targetPlanId)

    try {
      if (isPaidPlan(targetPlanId) && !isPaidPlan(currentPlanId)) {
        const response = await checkoutMutation.mutateAsync({
          planId: targetPlanId,
          seats: billableSeats,
        })
        window.location.assign(response.checkout.url)
        return
      }

      const payload = isPaidPlan(targetPlanId)
        ? { planId: targetPlanId, seats: billableSeats }
        : { planId: targetPlanId }
      const response = await changePlanMutation.mutateAsync(payload)
      setActionMessage(response.change.message)
      router.replace(SETTINGS_ORGANIZATION_BILLING_PATH)
    } catch (error) {
      setActionError(getApiFriendlyMessage(error, 'Unable to update billing right now.'))
    } finally {
      setActivePlanAction(null)
    }
  }

  return (
    <div className="space-y-6 p-6 pb-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button asChild size="sm" variant="ghost">
            <Link href={SETTINGS_ORGANIZATION_BILLING_PATH}>
              <ArrowLeft className="mr-2 h-3.5 w-3.5" />
              Back to billing
            </Link>
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Choose a plan</h2>
            <p className="text-sm text-muted-foreground">
              Pick the plan for {organization?.name ?? 'the active organisation'}. All billing
              changes are scoped to this organisation.
            </p>
          </div>
        </div>
        <StatusBadge tone={canManageBilling ? 'neutral' : 'warning'}>
          {canManageBilling ? `${seatsUsed ?? 0} active seats` : 'Owner or admin required'}
        </StatusBadge>
      </div>

      <div className="rounded-lg border border-border bg-background-deep p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
          <div>
            <p className="text-sm font-medium">How changes apply</p>
            <p className="mt-1 text-xs text-muted-foreground">
              New paid plans open Polar checkout. Paid upgrades apply with Polar proration.
              Downgrades and cancellations are scheduled for period end.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {getSelectablePlans().map((plan) => {
          const total = getMonthlySeatTotal(plan, seatsUsed)
          const blockedReason = getPlanChangeBlockedReason({
            canManageBilling,
            currentPlanId,
            targetPlanId: plan.id,
            seatsUsed,
            lifecycleState: billing?.lifecycleState ?? null,
          })
          const isCurrent = plan.id === currentPlanId
          const actionIsPending = isSubmitting && activePlanAction === plan.id

          return (
            <Card className={plan.highlighted ? 'border-accent/45' : undefined} key={plan.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription>{plan.tagline}</CardDescription>
                  </div>
                  <StatusBadge tone={planTone(plan.id, currentPlanId)}>
                    {isCurrent
                      ? 'Current'
                      : getPlanRank(plan.id) > getPlanRank(currentPlanId)
                        ? 'Upgrade'
                        : 'Downgrade'}
                  </StatusBadge>
                </div>
                <div className="pt-2">
                  <span className="text-3xl font-semibold">{formatPrice(plan)}</span>
                  {plan.priceMonthly && plan.priceMonthly > 0 ? (
                    <span className="ml-2 text-xs text-muted-foreground">{plan.priceUnit}</span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{plan.seatBand}</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-lg border border-border bg-background-deep p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Estimated monthly total
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {total === null ? 'Custom' : `${formatCurrency(total, plan.currency)} / month`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.priceMonthly === null
                      ? 'Custom pricing will be confirmed before checkout.'
                      : plan.priceMonthly === 0
                        ? 'No subscription required.'
                        : `${billableSeats} seats x ${formatCurrency(
                            plan.priceMonthly,
                            plan.currency
                          )}.`}
                  </p>
                </div>

                <div className="grid gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-accent" />
                    <span>{formatLimit(plan)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-accent" />
                    <span>{plan.limits.auditRetentionDays}-day audit retention</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-accent" />
                    <span>{plan.priceMonthly === 0 ? 'No payment method' : 'Card via Polar'}</span>
                  </div>
                </div>

                <ul className="space-y-2">
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

                {blockedReason ? (
                  <p className="rounded-md border border-border bg-background-deep px-3 py-2 text-xs text-muted-foreground">
                    {blockedReason}
                  </p>
                ) : null}

                <Button
                  className="w-full"
                  disabled={!hasMounted || Boolean(blockedReason) || isSubmitting}
                  onClick={() => void handleSelectPlan(plan.id)}
                  size="sm"
                  type="button"
                  variant={isCurrent ? 'outline' : 'default'}
                >
                  {!hasMounted
                    ? 'Loading billing...'
                    : actionLabel({
                        currentPlanId,
                        targetPlanId: plan.id,
                        isPending: actionIsPending,
                      })}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

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
    </div>
  )
}
