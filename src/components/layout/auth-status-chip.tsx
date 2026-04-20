'use client'

import { useAuth } from '@/lib/hooks/use-auth'

function getLabel(status: 'loading' | 'authenticated' | 'unauthenticated'): string {
  if (status === 'loading') {
    return 'Session loading'
  }

  if (status === 'authenticated') {
    return 'Authenticated'
  }

  return 'Unauthenticated'
}

export function AuthStatusChip() {
  const auth = useAuth()

  return (
    <div className="text-xs font-mono text-muted-foreground tracking-[0.12em] uppercase">
      {getLabel(auth.status)}
    </div>
  )
}
