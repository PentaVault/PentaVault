import { QueryClient } from '@tanstack/react-query'

import { clearAuthenticatedQueryCache, clearProjectScopedQueryCache } from '@/lib/query/cache'
import { queryKeys } from '@/lib/query/keys'

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

describe('query cache hardening', () => {
  it('removes project-scoped sensitive cache entries on organization switch', () => {
    const queryClient = createClient()
    queryClient.setQueryData(queryKeys.projectSecrets.list('project_123'), { secrets: [] })
    queryClient.setQueryData(queryKeys.projectTokens.list('project_123'), { tokens: [] })
    queryClient.setQueryData(queryKeys.projectAudit.list('project_123', {}), { events: [] })
    queryClient.setQueryData(queryKeys.notifications.all, { notifications: [] })

    clearProjectScopedQueryCache(queryClient)

    expect(queryClient.getQueryData(queryKeys.projectSecrets.list('project_123'))).toBeUndefined()
    expect(queryClient.getQueryData(queryKeys.projectTokens.list('project_123'))).toBeUndefined()
    expect(queryClient.getQueryData(queryKeys.projectAudit.list('project_123', {}))).toBeUndefined()
    expect(queryClient.getQueryData(queryKeys.notifications.all)).toEqual({ notifications: [] })
  })

  it('removes authenticated cache entries on sign-out or session expiry', () => {
    const queryClient = createClient()
    queryClient.setQueryData(queryKeys.projectSecrets.list('project_123'), { secrets: [] })
    queryClient.setQueryData(queryKeys.notifications.all, { notifications: [] })
    queryClient.setQueryData(queryKeys.organizations.all, { organizations: [] })
    queryClient.setQueryData(queryKeys.organizationMembers.list('org_123'), { members: [] })

    clearAuthenticatedQueryCache(queryClient)

    expect(queryClient.getQueryData(queryKeys.projectSecrets.list('project_123'))).toBeUndefined()
    expect(queryClient.getQueryData(queryKeys.notifications.all)).toBeUndefined()
    expect(queryClient.getQueryData(queryKeys.organizations.all)).toBeUndefined()
    expect(queryClient.getQueryData(queryKeys.organizationMembers.list('org_123'))).toBeUndefined()
  })
})
