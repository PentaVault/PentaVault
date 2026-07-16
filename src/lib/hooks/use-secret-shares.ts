'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { secretSharesApi } from '@/lib/api/secret-shares'
import { queryKeys } from '@/lib/query/keys'
import type { CreateSecretShareInput } from '@/lib/types/api'

export function useProjectSecretShares(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectSecretShares.list(projectId),
    queryFn: async () => {
      if (!projectId) throw new Error('projectId is required to list external shares')
      return secretSharesApi.list(projectId)
    },
    enabled: enabled && Boolean(projectId),
  })
}

function useInvalidateSecretShares(projectId: string | null) {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.projectSecretShares.list(projectId) })
  }
}

export function useCreateSecretShare(projectId: string | null) {
  const invalidate = useInvalidateSecretShares(projectId)
  return useMutation({
    mutationFn: async (input: CreateSecretShareInput) => {
      if (!projectId) throw new Error('projectId is required to create an external share')
      return secretSharesApi.create(projectId, input)
    },
    onSuccess: invalidate,
  })
}

export function useRevokeSecretShare(projectId: string | null) {
  const invalidate = useInvalidateSecretShares(projectId)
  return useMutation({
    mutationFn: async (shareId: string) => {
      if (!projectId) throw new Error('projectId is required to revoke an external share')
      return secretSharesApi.revoke(projectId, shareId)
    },
    onSuccess: invalidate,
  })
}
