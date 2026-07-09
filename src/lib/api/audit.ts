import { apiClient } from '@/lib/api/client'
import { auditListResponseSchema, parseApiResponse } from '@/lib/api/schemas'
import type { AuditListQuery, AuditListResponse } from '@/lib/types/api'
import { getApiErrorCode, getApiErrorStatus } from '@/lib/utils/errors'

export const auditApi = {
  async listProjectAudit(
    projectId: string,
    query: AuditListQuery = {}
  ): Promise<AuditListResponse> {
    const response = await apiClient.get<AuditListResponse>(`/v1/projects/${projectId}/audit`, {
      params: query,
    })
    return parseApiResponse(auditListResponseSchema, response.data)
  },

  async listOrganizationActivity(
    organizationId: string,
    query: AuditListQuery = {}
  ): Promise<AuditListResponse> {
    try {
      const response = await apiClient.get<AuditListResponse>(
        `/v1/organizations/${organizationId}/activity`,
        {
          params: query,
        }
      )
      return parseApiResponse(auditListResponseSchema, response.data)
    } catch (error) {
      if (getApiErrorStatus(error) === 404 && getApiErrorCode(error) === 'ROUTE_NOT_FOUND') {
        return { events: [], nextCursor: null }
      }

      throw error
    }
  },
}
