import { PLANS, type Plan, type PlanId } from '@/lib/billing/plans'
import { SETTINGS_ORGANIZATION_BILLING_PLANS_PATH } from '@/lib/constants'

export const PLAN_ORDER: readonly PlanId[] = ['free', 'pro', 'team']

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

export function getBillingUpgradePath(planId: PlanId): string {
  return `/settings/organization/billing/upgrade/${planId}`
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
