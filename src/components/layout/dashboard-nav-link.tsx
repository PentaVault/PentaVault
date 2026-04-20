'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils/cn'

type DashboardNavLinkProps = {
  href: string
  label: string
  icon?: React.ReactNode
  exact?: boolean
  collapsed?: boolean
}

function isLinkActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DashboardNavLink({
  href,
  label,
  icon,
  exact = false,
  collapsed = false,
}: DashboardNavLinkProps) {
  const pathname = usePathname()
  const active = isLinkActive(pathname, href, exact)

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        collapsed ? 'justify-center px-2' : 'justify-start',
        active
          ? 'border border-accent/35 text-accent'
          : 'border border-transparent text-muted-foreground hover:border-border hover:text-foreground'
      )}
      title={collapsed ? label : undefined}
    >
      {icon ? (
        <span className="inline-flex h-4 w-4 items-center justify-center text-current">{icon}</span>
      ) : null}
      {collapsed ? null : label}
    </Link>
  )
}
