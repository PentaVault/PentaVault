import { apiClient } from '@/lib/api/client'
import {
  auditLogStreamResponseSchema,
  auditLogStreamsResponseSchema,
  createAuditLogStreamInputSchema,
  parseApiInput,
  parseApiResponse,
  updateAuditLogStreamInputSchema,
} from '@/lib/api/schemas'
import type {
  AuditLogStreamResponse,
  AuditLogStreamsResponse,
  CreateAuditLogStreamInput,
  UpdateAuditLogStreamInput,
} from '@/lib/types/api'

export const auditLogStreamsApi = {
  async list(projectId: string): Promise<AuditLogStreamsResponse> {
    const response = await apiClient.get<AuditLogStreamsResponse>(
      `/v1/projects/${projectId}/audit-log-streams`
    )
    return parseApiResponse(auditLogStreamsResponseSchema, response.data)
  },

  async create(
    projectId: string,
    input: CreateAuditLogStreamInput
  ): Promise<AuditLogStreamResponse> {
    const response = await apiClient.post<AuditLogStreamResponse>(
      `/v1/projects/${projectId}/audit-log-streams`,
      parseApiInput(createAuditLogStreamInputSchema, input)
    )
    return parseApiResponse(auditLogStreamResponseSchema, response.data)
  },

  async update(
    projectId: string,
    streamId: string,
    input: UpdateAuditLogStreamInput
  ): Promise<AuditLogStreamResponse> {
    const response = await apiClient.patch<AuditLogStreamResponse>(
      `/v1/projects/${projectId}/audit-log-streams/${streamId}`,
      parseApiInput(updateAuditLogStreamInputSchema, input)
    )
    return parseApiResponse(auditLogStreamResponseSchema, response.data)
  },

  async remove(projectId: string, streamId: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete<{ deleted: boolean }>(
      `/v1/projects/${projectId}/audit-log-streams/${streamId}`
    )
    return response.data
  },
}
