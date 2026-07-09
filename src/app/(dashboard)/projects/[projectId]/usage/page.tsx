'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { getProjectAnalyticsPath } from '@/lib/constants'

export default function ProjectUsageRedirectPage() {
  const params = useParams<{ projectId: string }>()
  const router = useRouter()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null

  useEffect(() => {
    if (projectId) {
      router.replace(getProjectAnalyticsPath(projectId))
    }
  }, [projectId, router])

  return null
}
