import axios from 'axios'

import { apiClient } from '@/lib/api/client'
import { createMockSession, isMockAuthEnabled, isMockCredential } from '@/lib/auth/mock-auth'
import { clearClientAuthHint, hasAuthCookieHint, setClientAuthHint } from '@/lib/auth/token'
import { AUTH_REVOKE_SESSION_PATH, AUTH_SESSIONS_PATH, AUTH_SESSION_PATH } from '@/lib/constants'
import { env } from '@/lib/env'
import type {
  AuthCreateApiKeyRequest,
  AuthCreateApiKeyResponse,
  AuthSessionListApiResponse,
  AuthSessionResponse,
  AuthSessionRevokeRequest,
  AuthSessionRevokeResponse,
  AuthSignInWithEmailInput,
  AuthSignUpWithEmailInput,
} from '@/lib/types/api'

function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response
}

export const authApi = {
  async getSession(): Promise<AuthSessionResponse | null> {
    if (isMockAuthEnabled()) {
      return hasAuthCookieHint() ? createMockSession() : null
    }

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
    if (isMockAuthEnabled()) {
      if (!hasAuthCookieHint()) {
        return {
          sessions: [],
        }
      }

      return {
        sessions: [
          {
            id: 'mock-session-1',
            current: true,
            expiresAt: null,
            ipAddress: '127.0.0.1',
            userAgent: 'Mock Browser Session',
          },
        ],
      }
    }

    const response = await apiClient.get<AuthSessionListApiResponse>(AUTH_SESSIONS_PATH)
    return response.data
  },

  async revokeSession(input: AuthSessionRevokeRequest): Promise<AuthSessionRevokeResponse> {
    if (isMockAuthEnabled()) {
      return {
        revoked: true,
        sessionId: input.sessionId,
      }
    }

    const response = await apiClient.post<AuthSessionRevokeResponse>(
      AUTH_REVOKE_SESSION_PATH,
      input
    )
    return response.data
  },

  async createApiKey(input: AuthCreateApiKeyRequest): Promise<AuthCreateApiKeyResponse> {
    if (isMockAuthEnabled()) {
      return {
        headerName: 'x-pv-api-key',
        key: 'pv_mock_key_demo_only',
        apiKey: {
          id: 'mock-api-key-1',
          name: input.name ?? 'demo-mock-key',
          start: 'pv_mock',
          prefix: 'pv_mock',
          expiresAt: null,
          metadata: {
            mode: 'mock',
          },
          rateLimitEnabled: false,
          rateLimitMax: null,
          rateLimitTimeWindow: null,
        },
      }
    }

    const response = await apiClient.post<AuthCreateApiKeyResponse>('/v1/auth/api-keys', input)
    return response.data
  },

  async signInWithEmail(input: AuthSignInWithEmailInput): Promise<void> {
    if (isMockAuthEnabled()) {
      if (!isMockCredential(input.email, input.password)) {
        throw new Error('Invalid email or password for mock account.')
      }

      setClientAuthHint()
      return
    }

    await apiClient.post('/auth/sign-in/email', {
      email: input.email,
      password: input.password,
      rememberMe: true,
    })
  },

  async signOut(): Promise<void> {
    if (isMockAuthEnabled()) {
      clearClientAuthHint()
      return
    }

    await apiClient.post('/auth/sign-out')
    clearClientAuthHint()
  },

  async signUpWithEmail(input: AuthSignUpWithEmailInput): Promise<void> {
    if (isMockAuthEnabled()) {
      if (input.email.trim().toLowerCase() !== env.mockAuthEmail.trim().toLowerCase()) {
        throw new Error(`Use mock email ${env.mockAuthEmail} for UI-only mode.`)
      }

      setClientAuthHint()
      return
    }

    await apiClient.post('/auth/sign-up/email', {
      name: input.name,
      email: input.email,
      password: input.password,
    })
  },

  async approveDevice(userCode: string): Promise<void> {
    if (isMockAuthEnabled()) {
      if (!userCode.trim()) {
        throw new Error('Device code is required.')
      }

      setClientAuthHint()
      return
    }

    await apiClient.post('/auth/device/approve', {
      userCode,
    })
  },
}
