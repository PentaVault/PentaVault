'use client'

import { type PropsWithChildren, createContext, useContext, useEffect, useState } from 'react'

import axios from 'axios'

import { authApi } from '@/lib/api/auth'
import { clearClientAuthHint } from '@/lib/auth/token'
import type { AuthContextValue, AuthSession } from '@/lib/types/auth'

type AuthProviderProps = PropsWithChildren

const AuthContext = createContext<AuthContextValue | null>(null)

async function readSession(): Promise<AuthSession | null> {
  try {
    return await authApi.getSession()
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null
    }

    throw error
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')

  async function refresh(): Promise<void> {
    const nextSession = await readSession()
    setSession(nextSession)
    setStatus(nextSession?.user.id ? 'authenticated' : 'unauthenticated')
  }

  function clear(): void {
    clearClientAuthHint()
    setSession(null)
    setStatus('unauthenticated')
  }

  useEffect(() => {
    let cancelled = false

    async function loadSession(): Promise<void> {
      const nextSession = await readSession()

      if (cancelled) {
        return
      }

      setSession(nextSession)
      setStatus(nextSession?.user.id ? 'authenticated' : 'unauthenticated')
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, status, refresh, clear }}>
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
