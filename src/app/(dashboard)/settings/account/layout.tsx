'use client'

import Link from 'next/link'

import { ChevronLeft, Key, Shield, User } from 'lucide-react'

import { DashboardNavLink } from '@/components/layout/dashboard-nav-link'
import {
  DASHBOARD_HOME_PATH,
  SETTINGS_ACCOUNT_API_KEYS_PATH,
  SETTINGS_ACCOUNT_PATH,
  SETTINGS_ACCOUNT_SESSIONS_PATH,
} from '@/lib/constants'

export default function AccountSettingsLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { href: SETTINGS_ACCOUNT_PATH, label: 'Profile', icon: User, exact: true },
    { href: SETTINGS_ACCOUNT_SESSIONS_PATH, label: 'Sessions', icon: Shield },
    { href: SETTINGS_ACCOUNT_API_KEYS_PATH, label: 'API keys', icon: Key },
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
          <p className="text-sm font-medium">Account</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Personal settings</p>
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
