import { apiClient } from '@/lib/api/client'
import { auditListResponseSchema, parseApiResponse } from '@/lib/api/schemas'
import type { AuditListQuery, AuditListResponse } from '@/lib/types/api'

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
}
