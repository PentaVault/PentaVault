import { env } from '@/lib/env'
import type { AuthSession } from '@/lib/types/auth'

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isMockAuthEnabled(): boolean {
  return env.mockAuthEnabled
}

export function isMockCredential(email: string, password: string): boolean {
  return (
    normalizeEmail(email) === normalizeEmail(env.mockAuthEmail) && password === env.mockAuthPassword
  )
}

export function createMockSession(): AuthSession {
  return {
    session: {
      id: 'mock-session-1',
      expiresAt: null,
    },
    user: {
      id: env.mockAuthUserId,
      email: env.mockAuthEmail,
      name: env.mockAuthName,
      image: null,
      emailVerified: true,
      defaultOrganizationId: 'org_mock_1',
    },
  }
}
