'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { appConnectionsApi } from '@/lib/api/app-connections'
import { queryKeys } from '@/lib/query/keys'
import type { CreateAppConnectionInput, UpdateAppConnectionInput } from '@/lib/types/api'

export function useOrganizationAppConnections(organizationId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.organizationAppConnections.list(organizationId),
    queryFn: async () => {
      if (!organizationId) throw new Error('organizationId is required to list app connections')
      return appConnectionsApi.list(organizationId)
    },
    enabled: enabled && Boolean(organizationId),
  })
}

function useInvalidateConnections() {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.organizationAppConnections.all })
  }
}

export function useCreateAppConnection(organizationId: string | null) {
  const invalidate = useInvalidateConnections()
  return useMutation({
    mutationFn: async (input: CreateAppConnectionInput) => {
      if (!organizationId) throw new Error('organizationId is required to create an app connection')
      return appConnectionsApi.create(organizationId, input)
    },
    onSuccess: invalidate,
  })
}

export function useUpdateAppConnection(organizationId: string | null) {
  const invalidate = useInvalidateConnections()
  return useMutation({
    mutationFn: async (payload: { connectionId: string; input: UpdateAppConnectionInput }) => {
      if (!organizationId) throw new Error('organizationId is required to update an app connection')
      return appConnectionsApi.update(organizationId, payload.connectionId, payload.input)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteAppConnection(organizationId: string | null) {
  const invalidate = useInvalidateConnections()
  return useMutation({
    mutationFn: async (connectionId: string) => {
      if (!organizationId) throw new Error('organizationId is required to delete an app connection')
      return appConnectionsApi.remove(organizationId, connectionId)
    },
    onSuccess: invalidate,
  })
}
