'use client'

import type { PropsWithChildren } from 'react'

import { Toaster } from '@/components/shared/toaster'
import { AuthProvider } from '@/providers/auth-provider'
import { QueryProvider } from '@/providers/query-provider'
import { ThemeProvider } from '@/providers/theme-provider'

type AppProvidersProps = PropsWithChildren<{
  nonce?: string
}>

export function AppProviders({ children, nonce }: AppProvidersProps) {
  const themeProviderProps = nonce ? { nonce } : {}

  return (
    <QueryProvider>
      <ThemeProvider {...themeProviderProps}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}
