import { apiClient } from '@/lib/api/client'
import type { PlanId } from '@/lib/billing/plans'

export type BillingStatus = {
  organizationId: string
  plan: PlanId
  effectivePlan: PlanId
  lifecycleState:
    | 'free'
    | 'active_paid'
    | 'pending_checkout'
    | 'pending_upgrade'
    | 'pending_downgrade'
    | 'pending_cancel'
    | 'past_due_grace'
    | 'past_due_restricted'
    | 'grant_active'
  status: string | null
  customerId: string | null
  subscriptionId: string | null
  productId: string | null
  billedSeats: number | null
  currentPeriodEnd: string | null
  graceEndsAt: string | null
  restricted: boolean
  recoveryRequired: boolean
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

export type BillingHistoryEvent = {
  id: string
  organizationId: string
  provider: string | null
  providerEventId: string | null
  providerCustomerId: string | null
  providerSubscriptionId: string | null
  eventType: string
  outcome: string
  actorUserId: string | null
  previousPlan: PlanId | null
  nextPlan: PlanId | null
  previousSeats: number | null
  nextSeats: number | null
  effectiveAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export type BillingAddress = {
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}

export type BillingProfile = {
  organizationId: string
  receiptEmail: string | null
  financeEmails: string[]
  businessName: string | null
  taxId: string | null
  address: BillingAddress
  updatedAt: string | null
}

export type BillingProfileInput = {
  receiptEmail?: string | null
  financeEmails?: string[]
  businessName?: string | null
  taxId?: string | null
  address?: Partial<BillingAddress>
}

export const billingApi = {
  async getSummary(): Promise<{ billing: BillingStatus }> {
    const response = await apiClient.get<{ billing: BillingStatus }>('/v1/billing/summary')
    return response.data
  },

  async createCheckout(input: {
    planId: Exclude<PlanId, 'free'>
    seats?: number
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

  async getHistory(limit = 25): Promise<{ history: { events: BillingHistoryEvent[] } }> {
    const response = await apiClient.get<{ history: { events: BillingHistoryEvent[] } }>(
      '/v1/billing/history',
      { params: { limit } }
    )
    return response.data
  },

  async getProfile(): Promise<{ profile: BillingProfile }> {
    const response = await apiClient.get<{ profile: BillingProfile }>('/v1/billing/profile')
    return response.data
  },

  async updateProfile(input: BillingProfileInput): Promise<{ profile: BillingProfile }> {
    const response = await apiClient.patch<{ profile: BillingProfile }>(
      '/v1/billing/profile',
      input
    )
    return response.data
  },
}
