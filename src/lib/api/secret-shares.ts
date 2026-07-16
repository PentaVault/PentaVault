import { apiClient } from '@/lib/api/client'
import {
  accessSecretShareResponseSchema,
  createSecretShareInputSchema,
  createSecretShareResponseSchema,
  parseApiInput,
  parseApiResponse,
  publicSecretShareResponseSchema,
  secretShareResponseSchema,
  secretSharesResponseSchema,
} from '@/lib/api/schemas'
import type {
  AccessSecretShareResponse,
  CreateSecretShareInput,
  CreateSecretShareResponse,
  PublicSecretShareResponse,
  SecretShareResponse,
  SecretSharesResponse,
} from '@/lib/types/api'

export const secretSharesApi = {
  async list(projectId: string): Promise<SecretSharesResponse> {
    const response = await apiClient.get<SecretSharesResponse>(
      `/v1/projects/${projectId}/secret-shares`
    )
    return parseApiResponse(secretSharesResponseSchema, response.data)
  },

  async create(
    projectId: string,
    input: CreateSecretShareInput
  ): Promise<CreateSecretShareResponse> {
    const response = await apiClient.post<CreateSecretShareResponse>(
      `/v1/projects/${projectId}/secret-shares`,
      parseApiInput(createSecretShareInputSchema, input)
    )
    return parseApiResponse(createSecretShareResponseSchema, response.data)
  },

  async revoke(projectId: string, shareId: string): Promise<SecretShareResponse> {
    const response = await apiClient.delete<SecretShareResponse>(
      `/v1/projects/${projectId}/secret-shares/${shareId}`
    )
    return parseApiResponse(secretShareResponseSchema, response.data)
  },

  async inspect(token: string): Promise<PublicSecretShareResponse> {
    const response = await apiClient.post<PublicSecretShareResponse>(
      '/v1/public/secret-shares/inspect',
      { token }
    )
    return parseApiResponse(publicSecretShareResponseSchema, response.data)
  },

  async access(token: string, password?: string): Promise<AccessSecretShareResponse> {
    const response = await apiClient.post<AccessSecretShareResponse>(
      '/v1/public/secret-shares/access',
      { token, password: password || undefined }
    )
    return parseApiResponse(accessSecretShareResponseSchema, response.data)
  },
}
