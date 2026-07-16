'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { secretSyncsApi } from '@/lib/api/secret-syncs'
import { queryKeys } from '@/lib/query/keys'
import type { CreateSecretSyncInput, UpdateSecretSyncInput } from '@/lib/types/api'

export function useProjectSecretSyncs(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectSecretSyncs.list(projectId),
    queryFn: async () => {
      if (!projectId) throw new Error('projectId is required to list secret syncs')
      return secretSyncsApi.list(projectId)
    },
    enabled: enabled && Boolean(projectId),
  })
}

export function useSecretSyncDeliveries(
  projectId: string | null,
  syncId?: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.projectSecretSyncs.deliveries(projectId, syncId),
    queryFn: async () => {
      if (!projectId) throw new Error('projectId is required to list secret sync deliveries')
      return secretSyncsApi.listDeliveries(projectId, syncId ?? undefined)
    },
    enabled: enabled && Boolean(projectId),
    refetchInterval: enabled ? 15_000 : false,
  })
}

function useInvalidateSecretSyncs(projectId: string | null) {
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSecretSyncs.list(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSecretSyncs.all }),
    ])
  }
}

export function useCreateSecretSync(projectId: string | null) {
  const invalidate = useInvalidateSecretSyncs(projectId)
  return useMutation({
    mutationFn: async (input: CreateSecretSyncInput) => {
      if (!projectId) throw new Error('projectId is required to create a secret sync')
      return secretSyncsApi.create(projectId, input)
    },
    onSuccess: invalidate,
  })
}

export function useUpdateSecretSync(projectId: string | null) {
  const invalidate = useInvalidateSecretSyncs(projectId)
  return useMutation({
    mutationFn: async (payload: { syncId: string; input: UpdateSecretSyncInput }) => {
      if (!projectId) throw new Error('projectId is required to update a secret sync')
      return secretSyncsApi.update(projectId, payload.syncId, payload.input)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteSecretSync(projectId: string | null) {
  const invalidate = useInvalidateSecretSyncs(projectId)
  return useMutation({
    mutationFn: async (syncId: string) => {
      if (!projectId) throw new Error('projectId is required to delete a secret sync')
      return secretSyncsApi.remove(projectId, syncId)
    },
    onSuccess: invalidate,
  })
}

export function useTestSecretSync(projectId: string | null) {
  return useMutation({
    mutationFn: async (syncId: string) => {
      if (!projectId) throw new Error('projectId is required to test a secret sync')
      return secretSyncsApi.test(projectId, syncId)
    },
  })
}

export function useRunSecretSync(projectId: string | null) {
  const invalidate = useInvalidateSecretSyncs(projectId)
  return useMutation({
    mutationFn: async (syncId: string) => {
      if (!projectId) throw new Error('projectId is required to run a secret sync')
      return secretSyncsApi.run(projectId, syncId)
    },
    onSuccess: invalidate,
  })
}

export function useRetrySecretSyncDelivery(projectId: string | null) {
  const invalidate = useInvalidateSecretSyncs(projectId)
  return useMutation({
    mutationFn: async (deliveryId: string) => {
      if (!projectId) throw new Error('projectId is required to retry a secret sync delivery')
      return secretSyncsApi.retry(projectId, deliveryId)
    },
    onSuccess: invalidate,
  })
}
