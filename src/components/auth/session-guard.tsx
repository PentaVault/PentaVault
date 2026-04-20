'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

import { buildLoginRedirectPath } from '@/lib/auth/paths'
import { AUTH_PROTECTED_PATH_PREFIXES } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'

type SessionGuardProps = {
  children: ReactNode
}

export function SessionGuard({ children }: SessionGuardProps) {
  const auth = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isProtectedPath = AUTH_PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  useEffect(() => {
    if (isProtectedPath && auth.status === 'unauthenticated') {
      router.replace(buildLoginRedirectPath(pathname))
    }
  }, [auth.status, isProtectedPath, pathname, router])

  if (isProtectedPath && auth.status === 'loading') {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-5xl items-center justify-center px-6 py-10">
        <div className="rounded-2xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground">
          Validating session...
        </div>
      </div>
    )
  }

  if (isProtectedPath && auth.status === 'unauthenticated') {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-5xl items-center justify-center px-6 py-10">
        <div className="rounded-2xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground">
          Redirecting to sign in...
        </div>
      </div>
    )
  }

  return <>{children}</>
}
