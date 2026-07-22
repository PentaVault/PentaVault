import { apiClient } from '@/lib/api/client'
import {
  appConnectionResponseSchema,
  appConnectionsResponseSchema,
  createAppConnectionInputSchema,
  parseApiInput,
  parseApiResponse,
  updateAppConnectionInputSchema,
} from '@/lib/api/schemas'
import type {
  AppConnectionResponse,
  AppConnectionsResponse,
  CreateAppConnectionInput,
  UpdateAppConnectionInput,
} from '@/lib/types/api'

export const appConnectionsApi = {
  async list(organizationId: string): Promise<AppConnectionsResponse> {
    const response = await apiClient.get<AppConnectionsResponse>(
      `/v1/organizations/${organizationId}/app-connections`
    )
    return parseApiResponse(appConnectionsResponseSchema, response.data)
  },

  async create(
    organizationId: string,
    input: CreateAppConnectionInput
  ): Promise<AppConnectionResponse> {
    const response = await apiClient.post<AppConnectionResponse>(
      `/v1/organizations/${organizationId}/app-connections`,
      parseApiInput(createAppConnectionInputSchema, input)
    )
    return parseApiResponse(appConnectionResponseSchema, response.data)
  },

  async update(
    organizationId: string,
    connectionId: string,
    input: UpdateAppConnectionInput
  ): Promise<AppConnectionResponse> {
    const response = await apiClient.patch<AppConnectionResponse>(
      `/v1/organizations/${organizationId}/app-connections/${connectionId}`,
      parseApiInput(updateAppConnectionInputSchema, input)
    )
    return parseApiResponse(appConnectionResponseSchema, response.data)
  },

  async remove(organizationId: string, connectionId: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete<{ deleted: boolean }>(
      `/v1/organizations/${organizationId}/app-connections/${connectionId}`
    )
    return response.data
  },
}
