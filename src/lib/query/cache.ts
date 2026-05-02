import type { QueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query/keys'

export const AUTH_EXPIRED_EVENT = 'pentavault:auth-expired'
export const SENSITIVE_QUERY_GC_TIME_MS = 60_000

export function clearProjectScopedQueryCache(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: queryKeys.projects.all })
  queryClient.removeQueries({ queryKey: queryKeys.projects.detailAll })
  queryClient.removeQueries({ queryKey: queryKeys.projectMembers.all })
  queryClient.removeQueries({ queryKey: queryKeys.projectSecrets.all })
  queryClient.removeQueries({ queryKey: queryKeys.projectTokens.all })
  queryClient.removeQueries({ queryKey: queryKeys.projectAudit.all })
  queryClient.removeQueries({ queryKey: queryKeys.projectAccessRequests.all })
  queryClient.removeQueries({ queryKey: queryKeys.projectSecurityAlerts.all })
  queryClient.removeQueries({ queryKey: queryKeys.projectSecurityRecommendations.all })
  queryClient.removeQueries({ queryKey: queryKeys.userSearchAll })
}

export function clearAuthenticatedQueryCache(queryClient: QueryClient): void {
  clearProjectScopedQueryCache(queryClient)
  queryClient.removeQueries({ queryKey: queryKeys.organizationMembers.all })
  queryClient.removeQueries({ queryKey: queryKeys.organizationInvitations.all })
  queryClient.removeQueries({ queryKey: queryKeys.organizations.all })
  queryClient.removeQueries({ queryKey: queryKeys.notifications.all })
  queryClient.removeQueries({ queryKey: queryKeys.invitationAll })
}

export function dispatchAuthExpired(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
}
