import { describe, expect, it, vi } from 'vitest'

import { authApi } from '@/lib/api/auth'
import { AUTH_SESSION_PATH } from '@/lib/constants'

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: apiClientMock.get,
  },
}))

vi.mock('@/lib/env', () => ({
  env: {
    apiUrl: 'http://localhost:3001/api',
    appUrl: 'http://localhost:3000',
    isDev: false,
    isProd: false,
    isTest: true,
    mockAuthEmail: 'demo@pentavault.local',
    mockAuthEnabled: false,
    mockAuthName: 'Demo User',
    mockAuthPassword: 'demo-password-123',
    mockAuthUserId: 'mock-user-1',
    nodeEnv: 'test',
  },
}))

describe('authApi', () => {
  it('treats an empty session payload as signed out', async () => {
    apiClientMock.get.mockResolvedValueOnce({ data: '' })

    await expect(authApi.getSession()).resolves.toBeNull()
    expect(apiClientMock.get).toHaveBeenCalledWith(AUTH_SESSION_PATH)
  })

  it('parses session payloads returned as JSON strings', async () => {
    apiClientMock.get.mockResolvedValueOnce({
      data: JSON.stringify({
        session: {
          id: 'session_123',
          expiresAt: null,
        },
        user: {
          id: 'user_123',
          email: 'user@example.com',
          name: 'User',
          image: null,
          emailVerified: true,
          twoFactorEnabled: false,
          defaultOrganizationId: null,
        },
      }),
    })

    await expect(authApi.getSession()).resolves.toMatchObject({
      user: {
        id: 'user_123',
      },
    })
  })
})
