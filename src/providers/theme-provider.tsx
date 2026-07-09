'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { PropsWithChildren } from 'react'

type ThemeProviderProps = PropsWithChildren<{
  nonce?: string
}>

export function ThemeProvider({ children, nonce }: ThemeProviderProps) {
  const nonceProps = nonce ? { nonce } : {}

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      {...nonceProps}
    >
      {children}
    </NextThemesProvider>
  )
}
