'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { networkPolicyApi } from '@/lib/api/network-policy'
import { queryKeys } from '@/lib/query/keys'
import type {
  CreateTrustedIpRuleInput,
  NetworkPolicyMode,
  UpdateTrustedIpRuleInput,
} from '@/lib/types/api'

function useInvalidateNetworkPolicy(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.organizationNetworkPolicy.detail(organizationId),
    })
  }, [queryClient, organizationId])
}

export function useOrganizationNetworkPolicy(organizationId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.organizationNetworkPolicy.detail(organizationId),
    queryFn: async () => {
      if (!organizationId) throw new Error('organizationId is required to read a network policy')
      return networkPolicyApi.get(organizationId)
    },
    enabled: enabled && Boolean(organizationId),
  })
}

export function useSetNetworkPolicyMode(organizationId: string | null) {
  const invalidate = useInvalidateNetworkPolicy(organizationId)
  return useMutation({
    mutationFn: async (mode: NetworkPolicyMode) => {
      if (!organizationId) throw new Error('organizationId is required to set a network policy')
      return networkPolicyApi.setMode(organizationId, mode)
    },
    onSuccess: invalidate,
  })
}

export function useAddTrustedIpRule(organizationId: string | null) {
  const invalidate = useInvalidateNetworkPolicy(organizationId)
  return useMutation({
    mutationFn: async (input: CreateTrustedIpRuleInput) => {
      if (!organizationId) throw new Error('organizationId is required to add a trusted IP')
      return networkPolicyApi.addRule(organizationId, input)
    },
    onSuccess: invalidate,
  })
}

export function useUpdateTrustedIpRule(organizationId: string | null) {
  const invalidate = useInvalidateNetworkPolicy(organizationId)
  return useMutation({
    mutationFn: async (variables: { ruleId: string; input: UpdateTrustedIpRuleInput }) => {
      if (!organizationId) throw new Error('organizationId is required to update a trusted IP')
      return networkPolicyApi.updateRule(organizationId, variables.ruleId, variables.input)
    },
    onSuccess: invalidate,
  })
}

export function useRemoveTrustedIpRule(organizationId: string | null) {
  const invalidate = useInvalidateNetworkPolicy(organizationId)
  return useMutation({
    mutationFn: async (ruleId: string) => {
      if (!organizationId) throw new Error('organizationId is required to remove a trusted IP')
      return networkPolicyApi.removeRule(organizationId, ruleId)
    },
    onSuccess: invalidate,
  })
}
