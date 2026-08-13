'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { secretReplicationsApi } from '@/lib/api/secret-replications'
import { queryKeys } from '@/lib/query/keys'
import type { CreateSecretReplicationInput } from '@/lib/types/api'

function useInvalidateSecretReplications(projectId: string | null) {
  const queryClient = useQueryClient()
  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectSecretReplications.list(projectId),
      }),
      // A sync writes secrets, so any list showing them is now stale.
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSecrets.all }),
    ])
  }, [queryClient, projectId])
}

export function useSecretReplications(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectSecretReplications.list(projectId),
    queryFn: async () => {
      if (!projectId) throw new Error('projectId is required to list secret replications')
      return secretReplicationsApi.list(projectId)
    },
    enabled: enabled && Boolean(projectId),
  })
}

export function useCreateSecretReplication(projectId: string | null) {
  const invalidate = useInvalidateSecretReplications(projectId)
  return useMutation({
    mutationFn: async (input: CreateSecretReplicationInput) => {
      if (!projectId) throw new Error('projectId is required to create a secret replication')
      return secretReplicationsApi.create(projectId, input)
    },
    onSuccess: invalidate,
  })
}

export function useSetSecretReplicationEnabled(projectId: string | null) {
  const invalidate = useInvalidateSecretReplications(projectId)
  return useMutation({
    mutationFn: async (variables: { replicationId: string; enabled: boolean }) => {
      if (!projectId) throw new Error('projectId is required to update a secret replication')
      return secretReplicationsApi.setEnabled(projectId, variables.replicationId, variables.enabled)
    },
    onSuccess: invalidate,
  })
}

export function useSyncSecretReplication(projectId: string | null) {
  const invalidate = useInvalidateSecretReplications(projectId)
  return useMutation({
    mutationFn: async (replicationId: string) => {
      if (!projectId) throw new Error('projectId is required to sync a secret replication')
      return secretReplicationsApi.sync(projectId, replicationId)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteSecretReplication(projectId: string | null) {
  const invalidate = useInvalidateSecretReplications(projectId)
  return useMutation({
    mutationFn: async (variables: { replicationId: string; deleteReplicatedSecrets?: boolean }) => {
      if (!projectId) throw new Error('projectId is required to remove a secret replication')
      return secretReplicationsApi.remove(
        projectId,
        variables.replicationId,
        variables.deleteReplicatedSecrets ?? false
      )
    },
    onSuccess: invalidate,
  })
}
