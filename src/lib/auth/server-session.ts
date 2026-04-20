import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { buildLoginRedirectPath } from '@/lib/auth/paths'
import { AUTH_HINT_COOKIE_NAME } from '@/lib/auth/token'
import { DASHBOARD_HOME_PATH } from '@/lib/constants'
import { env } from '@/lib/env'
import type { AuthSession } from '@/lib/types/auth'

function buildMockServerSession(): AuthSession {
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
    },
  }
}

function toCookieHeader(cookieEntries: Array<{ name: string; value: string }>): string {
  return cookieEntries.map((entry) => `${entry.name}=${entry.value}`).join('; ')
}

export async function readServerSession(): Promise<AuthSession | null> {
  if (env.mockAuthEnabled) {
    const cookieStore = await cookies()
    const mockAuthCookie = cookieStore.get(AUTH_HINT_COOKIE_NAME)

    if (mockAuthCookie?.value === '1') {
      return buildMockServerSession()
    }

    return null
  }

  const cookieStore = await cookies()
  const cookieEntries = cookieStore.getAll()

  if (cookieEntries.length === 0) {
    return null
  }

  const cookieHeader = toCookieHeader(cookieEntries)

  try {
    const response = await fetch(`${env.apiUrl}/v1/auth/session`, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    if (response.status === 401) {
      return null
    }

    if (!response.ok) {
      return null
    }

    const session = (await response.json()) as AuthSession
    return session?.user?.id ? session : null
  } catch {
    return null
  }
}

export async function requireServerSession(nextPath: string): Promise<AuthSession> {
  const session = await readServerSession()

  if (!session?.user?.id) {
    redirect(buildLoginRedirectPath(nextPath))
  }

  return session
}

export async function redirectAuthenticatedToDashboard(): Promise<void> {
  const session = await readServerSession()

  if (session?.user?.id) {
    redirect(DASHBOARD_HOME_PATH)
  }
}
