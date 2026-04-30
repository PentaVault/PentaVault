import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { parseApiResponse, userSearchResponseSchema } from '@/lib/api/schemas'
import type { UserSearchResponse } from '@/lib/types/api'

export const usersApi = {
  async checkUsername(username: string): Promise<{ available: boolean; username: string }> {
    const response = await apiClient.get<{ available: boolean; username: string }>(
      '/v1/users/check-username',
      { params: { username } }
    )
    return parseApiResponse(
      z.object({ available: z.boolean(), username: z.string() }),
      response.data
    )
  },

  async search(query: string, organizationId: string): Promise<UserSearchResponse> {
    const response = await apiClient.get<UserSearchResponse>('/v1/users/search', {
      params: { q: query, organizationId },
    })
    return parseApiResponse(userSearchResponseSchema, response.data)
  },
}
