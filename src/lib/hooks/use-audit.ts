'use client'

import { useQuery } from '@tanstack/react-query'

import { auditApi } from '@/lib/api/audit'

export function useAudit(projectId: string | null) {
  return useQuery({
    queryKey: ['project-audit', projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to load audit events')
      }

      return auditApi.listProjectAudit(projectId)
    },
    enabled: Boolean(projectId),
  })
}
