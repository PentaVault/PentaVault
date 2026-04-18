import { apiClient } from '@/lib/api/client'
import { AUTH_REVOKE_SESSION_PATH, AUTH_SESSIONS_PATH, AUTH_SESSION_PATH } from '@/lib/constants'
import type {
  AuthSessionListApiResponse,
  AuthSessionResponse,
  AuthSessionRevokeRequest,
  AuthSessionRevokeResponse,
} from '@/lib/types/api'

export const authApi = {
  async getSession(): Promise<AuthSessionResponse> {
    const response = await apiClient.get<AuthSessionResponse>(AUTH_SESSION_PATH)
    return response.data
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
