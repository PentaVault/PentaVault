'use client'

import Link from 'next/link'

import { DASHBOARD_HOME_PATH, LOGIN_PATH, PROJECTS_PATH, REGISTER_PATH } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { cn } from '@/lib/utils/cn'

type HomeCtaProps = {
  /** "header" renders compact pills; "hero" renders large primary buttons. */
  variant: 'header' | 'hero'
  className?: string
}

/**
 * Auth-aware call-to-action used by both the marketing header and the hero.
 * The header shows a single "Dashboard" button when signed in, otherwise
 * "Sign in" + "Get started". The hero always shows two side-by-side buttons:
 * signed-in visitors get "Open dashboard" + "View projects", everyone else
 * gets "Get started free" + "Sign in". While auth status is resolving we
 * render the signed-out buttons so nothing flickers to empty (they navigate
 * correctly either way).
 */
export function HomeCta({ variant, className }: HomeCtaProps) {
  const auth = useAuth()
  const isAuthenticated = auth.status === 'authenticated'

  if (variant === 'header') {
    if (isAuthenticated) {
      return (
        <div className={cn('flex items-center gap-2', className)}>
          <Link
            className="inline-flex h-9 items-center rounded-lg bg-accent-strong px-4 text-sm font-semibold text-background shadow-sm transition-colors hover:bg-accent"
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
          className="hidden h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          href={LOGIN_PATH}
        >
          Sign in
        </Link>
        <Link
          className="inline-flex h-9 items-center rounded-lg bg-accent-strong px-4 text-sm font-semibold text-background shadow-sm transition-colors hover:bg-accent"
          href={REGISTER_PATH}
        >
          Get started
        </Link>
      </div>
    )
  }

  // hero variant — always two buttons side by side
  const primaryHref = isAuthenticated ? DASHBOARD_HOME_PATH : REGISTER_PATH
  const primaryLabel = isAuthenticated ? 'Open dashboard' : 'Get started free'
  const secondaryHref = isAuthenticated ? PROJECTS_PATH : LOGIN_PATH
  const secondaryLabel = isAuthenticated ? 'View projects' : 'Sign in'

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 sm:flex-row', className)}>
      <Link
        className="inline-flex h-12 items-center justify-center rounded-lg bg-accent-strong px-8 text-base font-semibold text-background shadow-lg shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] transition-transform hover:-translate-y-0.5 hover:bg-accent"
        href={primaryHref}
      >
        {primaryLabel}
      </Link>
      <Link
        className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-border bg-card px-8 text-base font-semibold text-foreground transition-colors hover:border-accent hover:text-accent"
        href={secondaryHref}
      >
        {secondaryLabel}
      </Link>
    </div>
  )
}
