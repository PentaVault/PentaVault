'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BillingProfileInput } from '@/lib/api/billing'
import { billingApi } from '@/lib/api/billing'
import type { PlanId } from '@/lib/billing/plans'
import { useAuth } from '@/lib/hooks/use-auth'
import { queryKeys } from '@/lib/query/keys'

export function useBillingSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.billing.summary(),
    queryFn: billingApi.getSummary,
    enabled,
    retry: false,
  })
}

export function useBillingHistory(organizationId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.billing.history(organizationId),
    queryFn: () => billingApi.getHistory(10),
    enabled: Boolean(organizationId) && enabled,
    retry: false,
  })
}

export function useBillingProfile(organizationId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.billing.profile(organizationId),
    queryFn: billingApi.getProfile,
    enabled: Boolean(organizationId) && enabled,
    retry: false,
  })
}

export function useUpdateBillingProfile(organizationId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: BillingProfileInput) => billingApi.updateProfile(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.billing.summary() })
      await queryClient.invalidateQueries({ queryKey: queryKeys.billing.profile(organizationId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.billing.history(organizationId) })
    },
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
  const auth = useAuth()

  return useMutation({
    mutationFn: billingApi.changePlan,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all })
      await auth.refresh()
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
