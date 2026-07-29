import { apiClient } from '@/lib/api/client'
import {
  createScimTokenResponseSchema,
  parseApiResponse,
  scimTokensResponseSchema,
} from '@/lib/api/schemas'
import type { CreateScimTokenResponse, ScimTokensResponse } from '@/lib/types/api'

export const scimApi = {
  async list(): Promise<ScimTokensResponse> {
    const response = await apiClient.get<ScimTokensResponse>('/v1/scim/tokens')
    return parseApiResponse(scimTokensResponseSchema, response.data)
  },

  /** The response carries the plaintext token; it is never retrievable again. */
  async issue(label: string): Promise<CreateScimTokenResponse> {
    const response = await apiClient.post<CreateScimTokenResponse>('/v1/scim/tokens', { label })
    return parseApiResponse(createScimTokenResponseSchema, response.data)
  },

  async revoke(tokenId: string): Promise<void> {
    await apiClient.delete(`/v1/scim/tokens/${tokenId}`)
  },
}
