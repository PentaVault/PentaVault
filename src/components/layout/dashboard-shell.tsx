'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import { BarChart3, FolderKanban, LayoutDashboard, Settings } from 'lucide-react'

import { DashboardNavLink } from '@/components/layout/dashboard-nav-link'
import { ProfileMenu } from '@/components/layout/profile-menu'
import {
  APP_NAME,
  DASHBOARD_HOME_PATH,
  ONBOARDING_PATH,
  PROJECTS_PATH,
  SETTINGS_PATH,
} from '@/lib/constants'

type DashboardShellProps = {
  children: ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-[var(--header-glass)] backdrop-blur">
        <div className="flex w-full items-center justify-between px-2 py-3 sm:px-3 lg:px-4">
          <Link
            className="text-sm font-mono tracking-[0.12em] uppercase"
            href={DASHBOARD_HOME_PATH}
          >
            <span className="text-[#00c573]">{APP_NAME}</span> Console
          </Link>
          <ProfileMenu />
        </div>
      </header>

      <div className="grid w-full grid-cols-1 gap-0 md:grid-cols-[220px_1fr]">
        <aside className="border-b border-border bg-card md:min-h-[calc(100vh-57px)] md:border-r md:border-b-0">
          <nav className="flex flex-wrap gap-2 px-2 py-3 md:flex-col md:px-3 md:py-4">
            <DashboardNavLink
              exact
              href={DASHBOARD_HOME_PATH}
              icon={<LayoutDashboard />}
              label="Overview"
            />
            <DashboardNavLink href={PROJECTS_PATH} icon={<FolderKanban />} label="Projects" />
            <DashboardNavLink href={ONBOARDING_PATH} icon={<BarChart3 />} label="Onboarding" />
            <DashboardNavLink href={SETTINGS_PATH} icon={<Settings />} label="Settings" />
          </nav>
        </aside>

        <main className="min-h-[calc(100vh-57px)]">{children}</main>
      </div>
    </div>
  )
}
