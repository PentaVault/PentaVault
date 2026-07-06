'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { billingApi } from '@/lib/api/billing'
import type { PlanId } from '@/lib/billing/plans'
import { queryKeys } from '@/lib/query/keys'

export function useBillingSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.billing.summary(),
    queryFn: billingApi.getSummary,
    enabled,
    retry: false,
  })
}

export function useCreateBillingCheckout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: billingApi.createCheckout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
    },
  })
}

export function useChangeBillingPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: billingApi.changePlan,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all })
    },
  })
}

export function useOpenBillingPortal() {
  return useMutation({
    mutationFn: billingApi.createPortalSession,
    onSuccess: (response) => {
      window.location.assign(response.portal.url)
    },
  })
}

export function isPaidPlan(planId: PlanId): planId is Exclude<PlanId, 'free'> {
  return planId === 'pro' || planId === 'team'
}
