import { apiClient } from '@/lib/api/client'
import {
  createSecretReplicationInputSchema,
  parseApiInput,
  parseApiResponse,
  secretReplicationResponseSchema,
  secretReplicationSyncResponseSchema,
  secretReplicationsResponseSchema,
} from '@/lib/api/schemas'
import type {
  CreateSecretReplicationInput,
  SecretReplicationResponse,
  SecretReplicationSyncResponse,
  SecretReplicationsResponse,
} from '@/lib/types/api'

export const secretReplicationsApi = {
  async list(projectId: string): Promise<SecretReplicationsResponse> {
    const response = await apiClient.get<SecretReplicationsResponse>(
      `/v1/projects/${projectId}/secret-replications`
    )
    return parseApiResponse(secretReplicationsResponseSchema, response.data)
  },

  async create(
    projectId: string,
    input: CreateSecretReplicationInput
  ): Promise<SecretReplicationResponse> {
    const response = await apiClient.post<SecretReplicationResponse>(
      `/v1/projects/${projectId}/secret-replications`,
      parseApiInput(createSecretReplicationInputSchema, input)
    )
    return parseApiResponse(secretReplicationResponseSchema, response.data)
  },

  async setEnabled(
    projectId: string,
    replicationId: string,
    enabled: boolean
  ): Promise<SecretReplicationResponse> {
    const response = await apiClient.patch<SecretReplicationResponse>(
      `/v1/projects/${projectId}/secret-replications/${replicationId}`,
      { enabled }
    )
    return parseApiResponse(secretReplicationResponseSchema, response.data)
  },

  async sync(projectId: string, replicationId: string): Promise<SecretReplicationSyncResponse> {
    const response = await apiClient.post<SecretReplicationSyncResponse>(
      `/v1/projects/${projectId}/secret-replications/${replicationId}/sync`
    )
    return parseApiResponse(secretReplicationSyncResponseSchema, response.data)
  },

  /**
   * `deleteReplicatedSecrets` is opt-in. Detaching leaves the copies behind as
   * ordinary secrets, which is the outcome that can still be undone.
   */
  async remove(
    projectId: string,
    replicationId: string,
    deleteReplicatedSecrets = false
  ): Promise<void> {
    await apiClient.delete(
      `/v1/projects/${projectId}/secret-replications/${replicationId}` +
        (deleteReplicatedSecrets ? '?deleteReplicatedSecrets=true' : '')
    )
  },
}
