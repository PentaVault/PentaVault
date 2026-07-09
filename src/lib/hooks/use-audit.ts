'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { auditApi } from '@/lib/api/audit'
import { queryKeys } from '@/lib/query/keys'
import type { AuditListQuery } from '@/lib/types/api'
import { getApiErrorStatus } from '@/lib/utils/errors'

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
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => getApiErrorStatus(error) !== 429 && failureCount < 1,
    staleTime: 30_000,
  })
}

export function useOrganizationActivity(
  organizationId: string | null,
  query: AuditListQuery = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.organizationActivity.infinite(organizationId, query),
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('organizationId is required to load activity')
      }

      return auditApi.listOrganizationActivity(organizationId, query)
    },
    enabled: Boolean(organizationId) && enabled,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => getApiErrorStatus(error) !== 429 && failureCount < 1,
    staleTime: 30_000,
  })
}

export function useInfiniteOrganizationActivity(
  organizationId: string | null,
  query: Omit<AuditListQuery, 'cursor'> = {},
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: queryKeys.organizationActivity.list(organizationId, query),
    queryFn: async ({ pageParam }) => {
      if (!organizationId) {
        throw new Error('organizationId is required to load activity')
      }

      return auditApi.listOrganizationActivity(organizationId, {
        ...query,
        ...(pageParam ? { cursor: pageParam } : {}),
      })
    },
    enabled: Boolean(organizationId) && enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => getApiErrorStatus(error) !== 429 && failureCount < 1,
    staleTime: 30_000,
  })
}
