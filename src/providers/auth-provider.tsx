'use client'

import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useStore } from 'zustand'

import { authApi } from '@/lib/api/auth'
import { clearClientAuthHint } from '@/lib/auth/token'
import { clearAuthenticatedQueryCache } from '@/lib/query/cache'
import { type AuthStore, type AuthStoreApi, createAuthStore } from '@/lib/stores/auth-store'
import type { AuthContextValue, AuthOrganizationMembership, AuthSession } from '@/lib/types/auth'
import { getApiErrorCode, getApiErrorStatus } from '@/lib/utils/errors'

type AuthProviderProps = PropsWithChildren

const AuthContext = createContext<AuthContextValue | null>(null)
const AuthStoreContext = createContext<AuthStoreApi | null>(null)

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
  const [store] = useState(() => createAuthStore())

  return (
    <AuthStoreContext.Provider value={store}>
      <AuthController>{children}</AuthController>
    </AuthStoreContext.Provider>
  )
}

function AuthController({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const session = useAuthStore((state) => state.session)
  const organizations = useAuthStore((state) => state.organizations)
  const status = useAuthStore((state) => state.status)
  const setAuthState = useAuthStore((state) => state.setAuthState)
  const clearAuthState = useAuthStore((state) => state.clearAuthState)

  const refresh = useCallback(async (): Promise<void> => {
    const [nextSession, nextOrganizations] = await Promise.all([readSession(), readOrganizations()])
    setAuthState({
      session: nextSession,
      organizations: dedupeOrganizations(nextOrganizations),
      status: nextSession?.user.id ? 'authenticated' : 'unauthenticated',
    })
  }, [setAuthState])

  const setActiveOrganization = useCallback(
    async (input: Parameters<AuthContextValue['setActiveOrganization']>[0]): Promise<void> => {
      const targetOrganization =
        (input.organizationId
          ? organizations.find((entry) => entry.organization.id === input.organizationId)
          : undefined) ??
        (input.organizationSlug
          ? organizations.find((entry) => entry.organization.slug === input.organizationSlug)
          : undefined)

      if (targetOrganization) {
        setAuthState({
          organizations: setOrganizationsActiveState(
            organizations,
            targetOrganization.organization.id
          ),
          session: session
            ? {
                ...session,
                session: {
                  ...session.session,
                  activeOrganizationId: targetOrganization.organization.id,
                  activeOrganizationSlug: targetOrganization.organization.slug,
                },
              }
            : session,
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
    },
    [organizations, refresh, session, setAuthState]
  )

  const clear = useCallback((): void => {
    clearClientAuthHint()
    clearAuthenticatedQueryCache(queryClient)
    clearAuthState()
  }, [clearAuthState, queryClient])

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

      setAuthState({
        session: nextSession,
        organizations: dedupeOrganizations(nextOrganizations),
        status: nextSession?.user.id ? 'authenticated' : 'unauthenticated',
      })
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [setAuthState])

  const activeOrganization =
    organizations.find((entry) => entry.organization.active) ??
    organizations.find(
      (entry) => entry.organization.id === session?.session.activeOrganizationId
    ) ??
    organizations[0] ??
    null

  const contextValue = useMemo(
    () => ({
      session,
      organizations,
      activeOrganization,
      status,
      refresh,
      setActiveOrganization,
      clear,
    }),
    [activeOrganization, clear, organizations, refresh, session, setActiveOrganization, status]
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuthStore<T>(selector: (store: AuthStore) => T): T {
  const store = useContext(AuthStoreContext)

  if (!store) {
    throw new Error('useAuthStore must be used within AuthProvider')
  }

  return useStore(store, selector)
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }

  return context
}
