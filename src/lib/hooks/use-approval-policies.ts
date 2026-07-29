'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { approvalPoliciesApi } from '@/lib/api/approval-policies'
import { queryKeys } from '@/lib/query/keys'
import type { CreateApprovalPolicyInput, UpdateApprovalPolicyInput } from '@/lib/types/api'

function useInvalidateApprovalPolicies(projectId: string | null) {
  const queryClient = useQueryClient()
  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.projectApprovalPolicies.list(projectId),
    })
  }, [queryClient, projectId])
}

export function useProjectApprovalPolicies(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectApprovalPolicies.list(projectId),
    queryFn: async () => {
      if (!projectId) throw new Error('projectId is required to list approval policies')
      return approvalPoliciesApi.list(projectId)
    },
    enabled: enabled && Boolean(projectId),
  })
}

export function useCreateApprovalPolicy(projectId: string | null) {
  const invalidate = useInvalidateApprovalPolicies(projectId)
  return useMutation({
    mutationFn: async (input: CreateApprovalPolicyInput) => {
      if (!projectId) throw new Error('projectId is required to create an approval policy')
      return approvalPoliciesApi.create(projectId, input)
    },
    onSuccess: invalidate,
  })
}

export function useUpdateApprovalPolicy(projectId: string | null) {
  const invalidate = useInvalidateApprovalPolicies(projectId)
  return useMutation({
    mutationFn: async (payload: { policyId: string; input: UpdateApprovalPolicyInput }) => {
      if (!projectId) throw new Error('projectId is required to update an approval policy')
      return approvalPoliciesApi.update(projectId, payload.policyId, payload.input)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteApprovalPolicy(projectId: string | null) {
  const invalidate = useInvalidateApprovalPolicies(projectId)
  return useMutation({
    mutationFn: async (policyId: string) => {
      if (!projectId) throw new Error('projectId is required to delete an approval policy')
      return approvalPoliciesApi.remove(projectId, policyId)
    },
    onSuccess: invalidate,
  })
}
