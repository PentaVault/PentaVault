'use client'

import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react'

import { authApi } from '@/lib/api/auth'
import { clearClientAuthHint } from '@/lib/auth/token'
import type { AuthContextValue, AuthOrganizationMembership, AuthSession } from '@/lib/types/auth'
import { getApiErrorCode, getApiErrorStatus } from '@/lib/utils/errors'

type AuthProviderProps = PropsWithChildren

const AuthContext = createContext<AuthContextValue | null>(null)

function dedupeOrganizations(
  organizations: AuthOrganizationMembership[]
): AuthOrganizationMembership[] {
  const seen = new Set<string>()

  return organizations.filter((entry) => {
    if (seen.has(entry.organization.id)) {
      return false
    }

    seen.add(entry.organization.id)
    return true
  })
}

function setOrganizationsActiveState(
  organizations: AuthOrganizationMembership[],
  activeOrganizationId: string
): AuthOrganizationMembership[] {
  return organizations.map((entry) => ({
    ...entry,
    organization: {
      ...entry.organization,
      active: entry.organization.id === activeOrganizationId,
    },
  }))
}

async function readSession(): Promise<AuthSession | null> {
  const session = await authApi.getSession()
  return session
}

async function readOrganizations(): Promise<AuthOrganizationMembership[]> {
  const response = await authApi.listOrganizations()
  return response.organizations
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [organizations, setOrganizations] = useState<AuthOrganizationMembership[]>([])
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')

  async function refresh(): Promise<void> {
    const [nextSession, nextOrganizations] = await Promise.all([readSession(), readOrganizations()])
    setSession(nextSession)
    setOrganizations(dedupeOrganizations(nextOrganizations))
    setStatus(nextSession?.user.id ? 'authenticated' : 'unauthenticated')
  }

  async function setActiveOrganization(
    input: Parameters<AuthContextValue['setActiveOrganization']>[0]
  ): Promise<void> {
    const targetOrganization =
      (input.organizationId
        ? organizations.find((entry) => entry.organization.id === input.organizationId)
        : undefined) ??
      (input.organizationSlug
        ? organizations.find((entry) => entry.organization.slug === input.organizationSlug)
        : undefined)

    if (targetOrganization) {
      setOrganizations((previousOrganizations) =>
        setOrganizationsActiveState(previousOrganizations, targetOrganization.organization.id)
      )
      setSession((previousSession) => {
        if (!previousSession) {
          return previousSession
        }

        return {
          ...previousSession,
          session: {
            ...previousSession.session,
            activeOrganizationId: targetOrganization.organization.id,
            activeOrganizationSlug: targetOrganization.organization.slug,
          },
        }
      })
    }

    try {
      await authApi.setActiveOrganization(input)
      await refresh()
    } catch (error) {
      const status = getApiErrorStatus(error)
      const code = getApiErrorCode(error)
      const canUseLocalFallback =
        Boolean(targetOrganization) && status === 500 && code === 'AUTH_FAILURE'

      if (!canUseLocalFallback) {
        throw error
      }
    }
  }

  function clear(): void {
    clearClientAuthHint()
    setSession(null)
    setOrganizations([])
    setStatus('unauthenticated')
  }

  useEffect(() => {
    let cancelled = false

    async function loadSession(): Promise<void> {
      const [nextSession, nextOrganizations] = await Promise.all([
        readSession(),
        readOrganizations(),
      ])

      if (cancelled) {
        return
      }

      setSession(nextSession)
      setOrganizations(dedupeOrganizations(nextOrganizations))
      setStatus(nextSession?.user.id ? 'authenticated' : 'unauthenticated')
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [])

  const activeOrganization =
    organizations.find((entry) => entry.organization.active) ??
    organizations.find(
      (entry) => entry.organization.id === session?.session.activeOrganizationId
    ) ??
    organizations[0] ??
    null

  return (
    <AuthContext.Provider
      value={{
        session,
        organizations,
        activeOrganization,
        status,
        refresh,
        setActiveOrganization,
        clear,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }

  return context
}
