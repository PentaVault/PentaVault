'use client'

import { Building2, ChevronLeft, CreditCard, Settings, ShieldCheck, Users } from 'lucide-react'
import Link from 'next/link'

import { DashboardNavLink } from '@/components/layout/dashboard-nav-link'
import {
  DASHBOARD_HOME_PATH,
  SETTINGS_ORGANIZATION_ACCESS_PATH,
  SETTINGS_ORGANIZATION_BILLING_PATH,
  SETTINGS_ORGANIZATION_MEMBERS_PATH,
  SETTINGS_ORGANIZATION_PATH,
} from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'

export default function OrgSettingsLayout({ children }: { children: React.ReactNode }) {
  const { activeOrganization } = useAuth()
  const activeOrg = activeOrganization?.organization
  const role = activeOrganization?.membership.role
  const canManageAccess = role === 'owner' || role === 'admin'

  const navItems = [
    { href: SETTINGS_ORGANIZATION_PATH, label: 'General', icon: Settings, exact: true },
    { href: SETTINGS_ORGANIZATION_MEMBERS_PATH, label: 'Members', icon: Users },
    ...(canManageAccess
      ? [{ href: SETTINGS_ORGANIZATION_ACCESS_PATH, label: 'Access control', icon: ShieldCheck }]
      : []),
    { href: SETTINGS_ORGANIZATION_BILLING_PATH, label: 'Billing', icon: CreditCard },
  ]

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="flex h-full w-56 flex-shrink-0 flex-col overflow-y-auto border-r border-border">
        <div className="border-b border-border p-3">
          <Link
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            href={DASHBOARD_HOME_PATH}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
        </div>

        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <p className="truncate text-sm font-medium">{activeOrg?.name ?? 'Organisation'}</p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Organisation settings</p>
        </div>

        <nav className="flex-1 space-y-0.5 p-2">
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <DashboardNavLink
                exact={item.exact ?? false}
                href={item.href}
                icon={<Icon />}
                key={item.href}
                label={item.label}
              />
            )
          })}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
