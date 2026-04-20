import type { ReactNode } from 'react'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { requireServerSession } from '@/lib/auth/server-session'
import { DASHBOARD_HOME_PATH } from '@/lib/constants'

type DashboardLayoutProps = {
  children: ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  await requireServerSession(DASHBOARD_HOME_PATH)

  return <DashboardShell>{children}</DashboardShell>
}
