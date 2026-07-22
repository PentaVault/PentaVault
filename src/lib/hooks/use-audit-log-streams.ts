'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { auditLogStreamsApi } from '@/lib/api/audit-log-streams'
import { queryKeys } from '@/lib/query/keys'
import type { CreateAuditLogStreamInput, UpdateAuditLogStreamInput } from '@/lib/types/api'

export function useProjectAuditLogStreams(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectAuditLogStreams.list(projectId),
    queryFn: async () => {
      if (!projectId) throw new Error('projectId is required to list audit log streams')
      return auditLogStreamsApi.list(projectId)
    },
    enabled: enabled && Boolean(projectId),
  })
}

function useInvalidateStreams() {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.projectAuditLogStreams.all })
  }
}

export function useCreateAuditLogStream(projectId: string | null) {
  const invalidate = useInvalidateStreams()
  return useMutation({
    mutationFn: async (input: CreateAuditLogStreamInput) => {
      if (!projectId) throw new Error('projectId is required to create an audit log stream')
      return auditLogStreamsApi.create(projectId, input)
    },
    onSuccess: invalidate,
  })
}

export function useUpdateAuditLogStream(projectId: string | null) {
  const invalidate = useInvalidateStreams()
  return useMutation({
    mutationFn: async (payload: { streamId: string; input: UpdateAuditLogStreamInput }) => {
      if (!projectId) throw new Error('projectId is required to update an audit log stream')
      return auditLogStreamsApi.update(projectId, payload.streamId, payload.input)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteAuditLogStream(projectId: string | null) {
  const invalidate = useInvalidateStreams()
  return useMutation({
    mutationFn: async (streamId: string) => {
      if (!projectId) throw new Error('projectId is required to delete an audit log stream')
      return auditLogStreamsApi.remove(projectId, streamId)
    },
    onSuccess: invalidate,
  })
}
