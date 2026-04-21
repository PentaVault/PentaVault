'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { DashboardOverview } from '@/components/dashboard/dashboard-overview'
import { getOrgDashboardPath } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'

export default function DashboardOverviewPage() {
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (auth.status === 'authenticated' && auth.activeOrganization?.organization.id) {
      router.replace(getOrgDashboardPath(auth.activeOrganization.organization.id))
    }
  }, [auth.activeOrganization?.organization.id, auth.status, router])

  return <DashboardOverview />
}
