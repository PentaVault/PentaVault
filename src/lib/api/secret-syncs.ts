import { apiClient } from '@/lib/api/client'
import {
  createSecretSyncInputSchema,
  parseApiInput,
  parseApiResponse,
  secretSyncDeliveriesResponseSchema,
  secretSyncDeliveryResponseSchema,
  secretSyncResponseSchema,
  secretSyncsResponseSchema,
  updateSecretSyncInputSchema,
} from '@/lib/api/schemas'
import type {
  CreateSecretSyncInput,
  SecretSyncDeliveriesResponse,
  SecretSyncDeliveryResponse,
  SecretSyncResponse,
  SecretSyncsResponse,
  UpdateSecretSyncInput,
} from '@/lib/types/api'

export const secretSyncsApi = {
  async list(projectId: string): Promise<SecretSyncsResponse> {
    const response = await apiClient.get<SecretSyncsResponse>(
      `/v1/projects/${projectId}/secret-syncs`
    )
    return parseApiResponse(secretSyncsResponseSchema, response.data)
  },

  async create(projectId: string, input: CreateSecretSyncInput): Promise<SecretSyncResponse> {
    const response = await apiClient.post<SecretSyncResponse>(
      `/v1/projects/${projectId}/secret-syncs`,
      parseApiInput(createSecretSyncInputSchema, input)
    )
    return parseApiResponse(secretSyncResponseSchema, response.data)
  },

  async update(
    projectId: string,
    syncId: string,
    input: UpdateSecretSyncInput
  ): Promise<SecretSyncResponse> {
    const response = await apiClient.patch<SecretSyncResponse>(
      `/v1/projects/${projectId}/secret-syncs/${syncId}`,
      parseApiInput(updateSecretSyncInputSchema, input)
    )
    return parseApiResponse(secretSyncResponseSchema, response.data)
  },

  async remove(projectId: string, syncId: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete<{ deleted: boolean }>(
      `/v1/projects/${projectId}/secret-syncs/${syncId}`
    )
    return response.data
  },

  async test(projectId: string, syncId: string): Promise<{ ok: boolean }> {
    const response = await apiClient.post<{ ok: boolean }>(
      `/v1/projects/${projectId}/secret-syncs/${syncId}/test`
    )
    return response.data
  },

  async run(projectId: string, syncId: string): Promise<SecretSyncDeliveryResponse> {
    const response = await apiClient.post<SecretSyncDeliveryResponse>(
      `/v1/projects/${projectId}/secret-syncs/${syncId}/run`
    )
    return parseApiResponse(secretSyncDeliveryResponseSchema, response.data)
  },

  async listDeliveries(
    projectId: string,
    syncId?: string,
    limit = 50
  ): Promise<SecretSyncDeliveriesResponse> {
    const response = await apiClient.get<SecretSyncDeliveriesResponse>(
      `/v1/projects/${projectId}/secret-sync-deliveries`,
      { params: { syncId, limit } }
    )
    return parseApiResponse(secretSyncDeliveriesResponseSchema, response.data)
  },

  async retry(projectId: string, deliveryId: string): Promise<SecretSyncDeliveryResponse> {
    const response = await apiClient.post<SecretSyncDeliveryResponse>(
      `/v1/projects/${projectId}/secret-sync-deliveries/${deliveryId}/retry`
    )
    return parseApiResponse(secretSyncDeliveryResponseSchema, response.data)
  },
}
