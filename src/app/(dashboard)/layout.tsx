import { headers } from 'next/headers'
import type { ReactNode } from 'react'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { requireServerSession } from '@/lib/auth/server-session'
import { DASHBOARD_HOME_PATH } from '@/lib/constants'

type DashboardLayoutProps = {
  children: ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const requestHeaders = await headers()
  const nextPath = requestHeaders.get('x-pentavault-current-path') ?? DASHBOARD_HOME_PATH

  await requireServerSession(nextPath)

  return <DashboardShell>{children}</DashboardShell>
}
