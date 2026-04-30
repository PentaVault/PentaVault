'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { securityApi } from '@/lib/api/security'
import { queryKeys } from '@/lib/query/keys'
import type { CreateProbableLeakAlertInput, UpdateSecurityAlertInput } from '@/lib/types/api'

export function useProjectSecurity(projectId: string | null, enabled = true) {
  const alertsQuery = useQuery({
    queryKey: queryKeys.projectSecurityAlerts.list(projectId),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to load security alerts')
      }

      return securityApi.listAlerts(projectId)
    },
    enabled: Boolean(projectId) && enabled,
  })

  const recommendationsQuery = useQuery({
    queryKey: queryKeys.projectSecurityRecommendations.list(projectId),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to load rotation recommendations')
      }

      return securityApi.listRecommendations(projectId)
    },
    enabled: Boolean(projectId) && enabled,
  })

  return {
    alertsQuery,
    recommendationsQuery,
  }
}

export function useCreateProbableLeakAlert(projectId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProbableLeakAlertInput) => {
      if (!projectId) {
        throw new Error('projectId is required to create probable leak alerts')
      }

      return securityApi.createProbableLeakAlert(projectId, input)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecurityAlerts.list(projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecurityRecommendations.list(projectId),
        }),
      ])
    },
  })
}

export function useUpdateSecurityAlert(projectId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { alertId: string; input: UpdateSecurityAlertInput }) => {
      if (!projectId) {
        throw new Error('projectId is required to update security alerts')
      }

      return securityApi.updateAlert(projectId, payload.alertId, payload.input)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecurityAlerts.list(projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecurityRecommendations.list(projectId),
        }),
      ])
    },
  })
}
