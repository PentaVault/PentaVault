'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { secretValidationRulesApi } from '@/lib/api/secret-validation-rules'
import { queryKeys } from '@/lib/query/keys'
import type {
  CreateSecretValidationRuleInput,
  UpdateSecretValidationRuleInput,
} from '@/lib/types/api'

export function useProjectSecretValidationRules(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectSecretValidationRules.list(projectId),
    queryFn: async () => {
      if (!projectId) throw new Error('projectId is required to list validation rules')
      return secretValidationRulesApi.list(projectId)
    },
    enabled: enabled && Boolean(projectId),
  })
}

function useInvalidateRules(projectId: string | null) {
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectSecretValidationRules.list(projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectSecretValidationRules.all,
      }),
    ])
  }
}

export function useCreateSecretValidationRule(projectId: string | null) {
  const invalidate = useInvalidateRules(projectId)
  return useMutation({
    mutationFn: async (input: CreateSecretValidationRuleInput) => {
      if (!projectId) throw new Error('projectId is required to create a validation rule')
      return secretValidationRulesApi.create(projectId, input)
    },
    onSuccess: invalidate,
  })
}

export function useUpdateSecretValidationRule(projectId: string | null) {
  const invalidate = useInvalidateRules(projectId)
  return useMutation({
    mutationFn: async (payload: { ruleId: string; input: UpdateSecretValidationRuleInput }) => {
      if (!projectId) throw new Error('projectId is required to update a validation rule')
      return secretValidationRulesApi.update(projectId, payload.ruleId, payload.input)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteSecretValidationRule(projectId: string | null) {
  const invalidate = useInvalidateRules(projectId)
  return useMutation({
    mutationFn: async (ruleId: string) => {
      if (!projectId) throw new Error('projectId is required to delete a validation rule')
      return secretValidationRulesApi.remove(projectId, ruleId)
    },
    onSuccess: invalidate,
  })
}
