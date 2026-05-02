import { useQuery } from '@tanstack/react-query'

import { analyticsApi } from '@/lib/api/analytics'
import { queryKeys } from '@/lib/query/keys'
import type { ProjectAnalyticsQuery } from '@/lib/types/api'

const ANALYTICS_REFETCH_INTERVAL_MS = 30_000

export function useProjectAnalytics(
  projectId: string | null,
  query: ProjectAnalyticsQuery = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.projectAnalytics.project(projectId, query),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to load project analytics')
      }
      return analyticsApi.getProjectAnalytics(projectId, query)
    },
    enabled: enabled && Boolean(projectId),
    refetchInterval: ANALYTICS_REFETCH_INTERVAL_MS,
  })
}

export function useSecretAnalytics(
  projectId: string | null,
  secretId: string | null,
  query: ProjectAnalyticsQuery = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.projectAnalytics.secret(projectId, secretId, query),
    queryFn: async () => {
      if (!projectId || !secretId) {
        throw new Error('projectId and secretId are required to load secret analytics')
      }
      return analyticsApi.getSecretAnalytics(projectId, secretId, query)
    },
    enabled: enabled && Boolean(projectId && secretId),
    refetchInterval: ANALYTICS_REFETCH_INTERVAL_MS,
  })
}

export function useUserAnalytics(
  projectId: string | null,
  userId: string | null,
  query: ProjectAnalyticsQuery = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.projectAnalytics.user(projectId, userId, query),
    queryFn: async () => {
      if (!projectId || !userId) {
        throw new Error('projectId and userId are required to load user analytics')
      }
      return analyticsApi.getUserAnalytics(projectId, userId, query)
    },
    enabled: enabled && Boolean(projectId && userId),
    refetchInterval: ANALYTICS_REFETCH_INTERVAL_MS,
  })
}

export function useTokenAnalytics(
  projectId: string | null,
  tokenId: string | null,
  query: ProjectAnalyticsQuery = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.projectAnalytics.token(projectId, tokenId, query),
    queryFn: async () => {
      if (!projectId || !tokenId) {
        throw new Error('projectId and tokenId are required to load token analytics')
      }
      return analyticsApi.getTokenAnalytics(projectId, tokenId, query)
    },
    enabled: enabled && Boolean(projectId && tokenId),
    refetchInterval: ANALYTICS_REFETCH_INTERVAL_MS,
  })
}
