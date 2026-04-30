'use client'

import { useQuery } from '@tanstack/react-query'

import { auditApi } from '@/lib/api/audit'
import { queryKeys } from '@/lib/query/keys'
import type { AuditListQuery } from '@/lib/types/api'

export function useAudit(projectId: string | null, query: AuditListQuery = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectAudit.list(projectId, query),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to load audit events')
      }

      return auditApi.listProjectAudit(projectId, query)
    },
    enabled: Boolean(projectId) && enabled,
  })
}
