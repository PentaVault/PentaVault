import { apiClient } from '@/lib/api/client'
import {
  parseApiInput,
  parseApiResponse,
  secretScanInputSchema,
  secretScanResponseSchema,
} from '@/lib/api/schemas'
import type { SecretScanInput, SecretScanResponse } from '@/lib/types/api'

export const secretScanningApi = {
  async scan(projectId: string, input: SecretScanInput): Promise<SecretScanResponse> {
    const response = await apiClient.post<SecretScanResponse>(
      `/v1/projects/${projectId}/secret-scans`,
      parseApiInput(secretScanInputSchema, input)
    )
    return parseApiResponse(secretScanResponseSchema, response.data)
  },
}
