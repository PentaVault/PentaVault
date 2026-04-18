'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { PropsWithChildren } from 'react'

type ThemeProviderProps = PropsWithChildren

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      {children}
    </NextThemesProvider>
  )
}
