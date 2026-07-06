import { describe, expect, it } from 'vitest'

import {
  getBillingUpgradePath,
  getHigherPlans,
  getMonthlySeatTotal,
  isHigherPlan,
  normalizePlanId,
} from '@/lib/billing/plan-utils'
import { getPlan } from '@/lib/billing/plans'

describe('billing plan utilities', () => {
  it('normalizes missing or unknown plan ids to free', () => {
    expect(normalizePlanId(undefined)).toBe('free')
    expect(normalizePlanId(null)).toBe('free')
    expect(normalizePlanId('enterprise')).toBe('free')
    expect(normalizePlanId('pro')).toBe('pro')
  })

  it('returns only higher-tier upgrade options', () => {
    expect(getHigherPlans('free').map((plan) => plan.id)).toEqual(['pro', 'team'])
    expect(getHigherPlans('pro').map((plan) => plan.id)).toEqual(['team'])
    expect(getHigherPlans('team').map((plan) => plan.id)).toEqual([])
  })

  it('keeps Team available to small organizations that want Team features', () => {
    expect(getHigherPlans('free').some((plan) => plan.id === 'team')).toBe(true)
    expect(getPlan('team').seatBand).toBe('Unlimited seats')
    expect(getPlan('team').features).toContain('Advanced team features and unlimited members')
  })

  it('describes Pro as up to 15 members without a minimum purchase band', () => {
    expect(getPlan('pro').seatBand).toBe('Up to 15 seats')
    expect(getPlan('pro').features).toContain('Up to 15 organisation members')
  })

  it('does not treat current or lower tiers as upgrades', () => {
    expect(isHigherPlan('pro', 'pro')).toBe(false)
    expect(isHigherPlan('team', 'pro')).toBe(false)
    expect(isHigherPlan('pro', 'team')).toBe(true)
  })

  it('builds the billing upgrade route for a plan', () => {
    expect(getBillingUpgradePath('team')).toBe('/settings/organization/billing/upgrade/team')
  })

  it('estimates per-seat monthly totals with a minimum of one billable seat', () => {
    expect(getMonthlySeatTotal(getPlan('free'), 3)).toBe(0)
    expect(getMonthlySeatTotal(getPlan('pro'), 4)).toBe(1400)
    expect(getMonthlySeatTotal(getPlan('team'), null)).toBe(600)
  })
})
