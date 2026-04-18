import { apiClient } from '@/lib/api/client'
import type {
  CreateSecretInput,
  CreateSecretResponse,
  ImportSecretsInput,
  ImportSecretsResponse,
} from '@/lib/types/api'

export const secretsApi = {
  async createSecret(input: CreateSecretInput): Promise<CreateSecretResponse> {
    const response = await apiClient.post<CreateSecretResponse>('/v1/secrets', input)
    return response.data
  },

  async importSecrets(input: ImportSecretsInput): Promise<ImportSecretsResponse> {
    const response = await apiClient.post<ImportSecretsResponse>('/v1/secrets/import', input)
    return response.data
  },
}
