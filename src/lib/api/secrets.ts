import { apiClient } from '@/lib/api/client'
import {
  createSecretResponseSchema,
  deleteSecretResponseSchema,
  importSecretsResponseSchema,
  parseApiResponse,
  projectSecretsResponseSchema,
  updateSecretResponseSchema,
} from '@/lib/api/schemas'
import type {
  CreateSecretInput,
  CreateSecretResponse,
  ImportSecretsInput,
  ImportSecretsResponse,
  ProjectSecretsResponse,
  UpdateSecretInput,
  UpdateSecretResponse,
} from '@/lib/types/api'

export const secretsApi = {
  async listProjectSecrets(projectId: string): Promise<ProjectSecretsResponse> {
    const response = await apiClient.get<ProjectSecretsResponse>(
      `/v1/projects/${projectId}/secrets`
    )
    return parseApiResponse(projectSecretsResponseSchema, response.data)
  },

  async createSecret(input: CreateSecretInput): Promise<CreateSecretResponse> {
    const response = await apiClient.post<CreateSecretResponse>('/v1/secrets', input)
    return parseApiResponse(createSecretResponseSchema, response.data)
  },

  async importSecrets(input: ImportSecretsInput): Promise<ImportSecretsResponse> {
    const response = await apiClient.post<ImportSecretsResponse>('/v1/secrets/import', input)
    return parseApiResponse(importSecretsResponseSchema, response.data)
  },

  async updateSecret(input: UpdateSecretInput): Promise<UpdateSecretResponse> {
    const response = await apiClient.patch<UpdateSecretResponse>(
      `/v1/projects/${input.projectId}/secrets/${input.secretId}`,
      {
        plaintext: input.plaintext,
      }
    )
    return parseApiResponse(updateSecretResponseSchema, response.data)
  },

  async deleteSecret(input: {
    projectId: string
    secretId: string
  }): Promise<{ deleted: boolean; alreadyDeleted?: boolean; revokedTokenCount?: number }> {
    const response = await apiClient.delete<{
      deleted: boolean
      alreadyDeleted?: boolean
      revokedTokenCount?: number
    }>(`/v1/projects/${input.projectId}/secrets/${input.secretId}`)
    return parseApiResponse(deleteSecretResponseSchema, response.data)
  },
}
