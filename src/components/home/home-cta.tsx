'use client'

import Link from 'next/link'

import { DASHBOARD_HOME_PATH, LOGIN_PATH, REGISTER_PATH } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { cn } from '@/lib/utils/cn'

type HomeCtaProps = {
  /** "header" renders compact pills; "hero" renders large primary buttons. */
  variant: 'header' | 'hero'
  className?: string
}

/**
 * Auth-aware call-to-action used by both the marketing header and the hero.
 * Signed-in visitors see a single "Dashboard" button; everyone else sees
 * "Sign in" + "Get started". While auth status is resolving we render the
 * signed-out buttons so nothing flickers to empty (they navigate correctly
 * either way).
 */
export function HomeCta({ variant, className }: HomeCtaProps) {
  const auth = useAuth()
  const isAuthenticated = auth.status === 'authenticated'

  if (variant === 'header') {
    if (isAuthenticated) {
      return (
        <div className={cn('flex items-center gap-2', className)}>
          <Link
            className="inline-flex h-9 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-400"
            href={DASHBOARD_HOME_PATH}
          >
            Dashboard
          </Link>
        </div>
      )
    }

    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Link
          className="hidden h-9 items-center rounded-lg px-3 text-sm font-medium text-slate-700 transition-colors hover:text-slate-950 sm:inline-flex"
          href={LOGIN_PATH}
        >
          Sign in
        </Link>
        <Link
          className="inline-flex h-9 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-400"
          href={REGISTER_PATH}
        >
          Get started
        </Link>
      </div>
    )
  }

  // hero variant
  if (isAuthenticated) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3 sm:flex-row', className)}>
        <Link
          className="inline-flex h-12 items-center justify-center rounded-lg bg-emerald-500 px-8 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 transition-transform hover:-translate-y-0.5 hover:bg-emerald-400"
          href={DASHBOARD_HOME_PATH}
        >
          Go to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 sm:flex-row', className)}>
      <Link
        className="inline-flex h-12 items-center justify-center rounded-lg bg-emerald-500 px-8 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 transition-transform hover:-translate-y-0.5 hover:bg-emerald-400"
        href={REGISTER_PATH}
      >
        Get started free
      </Link>
      <Link
        className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-8 text-base font-semibold text-slate-800 transition-colors hover:border-emerald-400 hover:text-emerald-600"
        href={LOGIN_PATH}
      >
        Sign in
      </Link>
    </div>
  )
}
