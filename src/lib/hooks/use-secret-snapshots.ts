'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { secretSnapshotsApi } from '@/lib/api/secret-snapshots'
import { queryKeys } from '@/lib/query/keys'
import type { CreateSecretSnapshotInput } from '@/lib/types/api'

export function useProjectSecretSnapshots(
  projectId: string | null,
  configId?: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.projectSecretSnapshots.list(projectId, configId),
    queryFn: async () => {
      if (!projectId) throw new Error('projectId is required to list snapshots')
      return secretSnapshotsApi.list(projectId, configId ?? undefined)
    },
    enabled: enabled && Boolean(projectId),
  })
}

function useInvalidateSnapshots() {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.projectSecretSnapshots.all,
    })
    await queryClient.invalidateQueries({
      queryKey: queryKeys.projectSecrets.all,
    })
  }
}

export function useCreateSecretSnapshot(projectId: string | null) {
  const invalidate = useInvalidateSnapshots()
  return useMutation({
    mutationFn: async (input: CreateSecretSnapshotInput) => {
      if (!projectId) throw new Error('projectId is required to create a snapshot')
      return secretSnapshotsApi.create(projectId, input)
    },
    onSuccess: invalidate,
  })
}

export function useRestoreSecretSnapshot(projectId: string | null) {
  const invalidate = useInvalidateSnapshots()
  return useMutation({
    mutationFn: async (snapshotId: string) => {
      if (!projectId) throw new Error('projectId is required to restore a snapshot')
      return secretSnapshotsApi.restore(projectId, snapshotId)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteSecretSnapshot(projectId: string | null) {
  const invalidate = useInvalidateSnapshots()
  return useMutation({
    mutationFn: async (snapshotId: string) => {
      if (!projectId) throw new Error('projectId is required to delete a snapshot')
      return secretSnapshotsApi.remove(projectId, snapshotId)
    },
    onSuccess: invalidate,
  })
}
