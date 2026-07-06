import { apiClient } from '@/lib/api/client'
import type { PlanId } from '@/lib/billing/plans'

export type BillingPaymentMethod = 'card' | 'upi'

export type BillingStatus = {
  organizationId: string
  plan: PlanId
  status: string | null
  customerId: string | null
  subscriptionId: string | null
  productId: string | null
  billedSeats: number | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  pendingPlan: PlanId | null
  pendingSeats: number | null
  pendingEffectiveAt: string | null
  canManageBilling: boolean
}

export type BillingCheckout = {
  mode: 'checkout'
  checkoutId: string | null
  url: string
  targetPlan: Exclude<PlanId, 'free'>
  seats: number
}

export type BillingChange = {
  mode: 'immediate' | 'next_period' | 'cancel_at_period_end'
  targetPlan: PlanId
  seats: number | null
  pendingEffectiveAt: string | null
  message: string
}

export const billingApi = {
  async getSummary(): Promise<{ billing: BillingStatus }> {
    const response = await apiClient.get<{ billing: BillingStatus }>('/v1/billing/summary')
    return response.data
  },

  async createCheckout(input: {
    planId: Exclude<PlanId, 'free'>
    seats?: number
    paymentMethod?: BillingPaymentMethod
  }): Promise<{ checkout: BillingCheckout }> {
    const response = await apiClient.post<{ checkout: BillingCheckout }>(
      '/v1/billing/checkout',
      input
    )
    return response.data
  },

  async changePlan(input: { planId: PlanId; seats?: number }): Promise<{ change: BillingChange }> {
    const response = await apiClient.post<{ change: BillingChange }>(
      '/v1/billing/change-plan',
      input
    )
    return response.data
  },

  async createPortalSession(): Promise<{ portal: { url: string } }> {
    const response = await apiClient.get<{ portal: { url: string } }>('/v1/billing/portal')
    return response.data
  },
}
