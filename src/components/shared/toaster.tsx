'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      closeButton
      duration={4000}
      position="top-right"
      richColors
      toastOptions={{
        className: 'border border-border bg-card text-foreground',
      }}
    />
  )
}
