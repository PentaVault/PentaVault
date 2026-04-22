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
  className?: string
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
  className,
}: DashboardNavLinkProps) {
  const pathname = usePathname()
  const active = isLinkActive(pathname, href, exact)

  return (
    <Link
      aria-current={active ? 'page' : undefined}
      href={href}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
        collapsed ? 'justify-center px-2' : 'justify-start',
        active
          ? 'bg-card-elevated font-medium text-foreground'
          : 'text-muted-foreground hover:bg-card-elevated hover:text-foreground',
        className
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
