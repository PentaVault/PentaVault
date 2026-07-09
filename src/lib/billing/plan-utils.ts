import { PLANS, type Plan, type PlanId } from '@/lib/billing/plans'
import { SETTINGS_ORGANIZATION_BILLING_PLANS_PATH } from '@/lib/constants'

export const PLAN_ORDER: readonly PlanId[] = ['free', 'pro', 'team']
const BLOCKING_LIFECYCLE_STATES = new Set([
  'pending_checkout',
  'pending_upgrade',
  'pending_downgrade',
  'pending_cancel',
])

export type BillingPlanChangeKind = 'current' | 'checkout' | 'upgrade' | 'downgrade' | 'cancel'

export type BillingPlanChangeState = {
  canManageBilling: boolean
  currentPlanId: PlanId
  targetPlanId: PlanId
  seatsUsed: number | null
  lifecycleState?: string | null
}

export function isPlanId(value: string | null | undefined): value is PlanId {
  return value === 'free' || value === 'pro' || value === 'team'
}

export function normalizePlanId(value: string | null | undefined): PlanId {
  return isPlanId(value) ? value : 'free'
}

export function getPlanRank(planId: PlanId): number {
  return PLAN_ORDER.indexOf(planId)
}

export function isHigherPlan(currentPlanId: PlanId, targetPlanId: PlanId): boolean {
  return getPlanRank(targetPlanId) > getPlanRank(currentPlanId)
}

export function getHigherPlans(currentPlanId: PlanId, plans: readonly Plan[] = PLANS): Plan[] {
  return plans.filter((plan) => isHigherPlan(currentPlanId, plan.id))
}

export function getSelectablePlans(plans: readonly Plan[] = PLANS): Plan[] {
  return [...plans]
}

export function getBillingPlansPath(): string {
  return SETTINGS_ORGANIZATION_BILLING_PLANS_PATH
}

export function getPlanChangeKind(
  currentPlanId: PlanId,
  targetPlanId: PlanId
): BillingPlanChangeKind {
  if (currentPlanId === targetPlanId) {
    return 'current'
  }

  if (targetPlanId === 'free') {
    return 'cancel'
  }

  if (currentPlanId === 'free') {
    return 'checkout'
  }

  return isHigherPlan(currentPlanId, targetPlanId) ? 'upgrade' : 'downgrade'
}

export function getPlanChangeBlockedReason(input: BillingPlanChangeState): string | null {
  if (!input.canManageBilling) {
    return 'Only organisation owners and admins can change billing.'
  }

  if (input.currentPlanId === input.targetPlanId) {
    return 'This is your current effective plan.'
  }

  if (input.lifecycleState && BLOCKING_LIFECYCLE_STATES.has(input.lifecycleState)) {
    if (input.lifecycleState === 'pending_checkout') {
      return 'Checkout is already pending. Finish it in Polar or wait for it to expire.'
    }

    return 'A billing change is already scheduled. Open Polar billing to update or undo it.'
  }

  if (input.targetPlanId === 'pro' && input.seatsUsed !== null && input.seatsUsed > 15) {
    return 'Remove members until the organisation has 15 or fewer seats before moving to Pro.'
  }

  if (input.targetPlanId === 'free' && input.currentPlanId === 'free') {
    return 'Free is already active.'
  }

  return null
}

export function getMonthlySeatTotal(
  plan: Pick<Plan, 'priceMonthly'>,
  seatsUsed: number | null
): number | null {
  if (plan.priceMonthly === null) {
    return null
  }

  if (plan.priceMonthly === 0) {
    return 0
  }

  return plan.priceMonthly * Math.max(seatsUsed ?? 1, 1)
}
