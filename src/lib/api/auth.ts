import axios from 'axios'

import { apiClient } from '@/lib/api/client'
import { AUTH_REVOKE_SESSION_PATH, AUTH_SESSIONS_PATH, AUTH_SESSION_PATH } from '@/lib/constants'
import type {
  AuthSessionListApiResponse,
  AuthSessionResponse,
  AuthSessionRevokeRequest,
  AuthSessionRevokeResponse,
} from '@/lib/types/api'

function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response
}

export const authApi = {
  async getSession(): Promise<AuthSessionResponse | null> {
    try {
      const response = await apiClient.get<AuthSessionResponse>(AUTH_SESSION_PATH)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return null
      }

      if (isNetworkError(error)) {
        return null
      }

      throw error
    }
  },

  async listSessions(): Promise<AuthSessionListApiResponse> {
    const response = await apiClient.get<AuthSessionListApiResponse>(AUTH_SESSIONS_PATH)
    return response.data
  },

  async revokeSession(input: AuthSessionRevokeRequest): Promise<AuthSessionRevokeResponse> {
    const response = await apiClient.post<AuthSessionRevokeResponse>(
      AUTH_REVOKE_SESSION_PATH,
      input
    )
    return response.data
  },
}
