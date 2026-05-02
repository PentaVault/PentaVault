import { apiClient } from '@/lib/api/client'
import {
  parseApiResponse,
  projectAnalyticsResponseSchema,
  scopedProjectAnalyticsResponseSchema,
} from '@/lib/api/schemas'
import type {
  ProjectAnalyticsQuery,
  ProjectAnalyticsResponse,
  ScopedProjectAnalyticsResponse,
} from '@/lib/types/api'

function analyticsParams(query: ProjectAnalyticsQuery | undefined) {
  return query
    ? {
        from: query.from,
        to: query.to,
        granularity: query.granularity,
        limit: query.limit,
      }
    : undefined
}

export const analyticsApi = {
  async getProjectAnalytics(
    projectId: string,
    query?: ProjectAnalyticsQuery
  ): Promise<ProjectAnalyticsResponse> {
    const response = await apiClient.get<ProjectAnalyticsResponse>(
      `/v1/analytics/projects/${projectId}`,
      { params: analyticsParams(query) }
    )
    return parseApiResponse(projectAnalyticsResponseSchema, response.data)
  },

  async getSecretAnalytics(
    projectId: string,
    secretId: string,
    query?: ProjectAnalyticsQuery
  ): Promise<ScopedProjectAnalyticsResponse> {
    const response = await apiClient.get<ScopedProjectAnalyticsResponse>(
      `/v1/analytics/projects/${projectId}/secrets/${secretId}`,
      { params: analyticsParams(query) }
    )
    return parseApiResponse(scopedProjectAnalyticsResponseSchema, response.data)
  },

  async getUserAnalytics(
    projectId: string,
    userId: string,
    query?: ProjectAnalyticsQuery
  ): Promise<ScopedProjectAnalyticsResponse> {
    const response = await apiClient.get<ScopedProjectAnalyticsResponse>(
      `/v1/analytics/projects/${projectId}/users/${userId}`,
      { params: analyticsParams(query) }
    )
    return parseApiResponse(scopedProjectAnalyticsResponseSchema, response.data)
  },

  async getTokenAnalytics(
    projectId: string,
    tokenId: string,
    query?: ProjectAnalyticsQuery
  ): Promise<ScopedProjectAnalyticsResponse> {
    const response = await apiClient.get<ScopedProjectAnalyticsResponse>(
      `/v1/analytics/projects/${projectId}/tokens/${tokenId}`,
      { params: analyticsParams(query) }
    )
    return parseApiResponse(scopedProjectAnalyticsResponseSchema, response.data)
  },
}
