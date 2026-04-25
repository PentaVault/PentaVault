'use client'

import { useQuery } from '@tanstack/react-query'

import { usersApi } from '@/lib/api/users'

export function useUserSearch(query: string, organizationId: string | null) {
  const normalizedQuery = query.trim()

  return useQuery({
    queryKey: ['user-search', organizationId, normalizedQuery],
    queryFn: async () => {
      if (!organizationId || normalizedQuery.length < 2) {
        return { users: [] }
      }

      return usersApi.search(normalizedQuery, organizationId)
    },
    enabled: Boolean(organizationId) && normalizedQuery.length >= 2,
    staleTime: 15_000,
  })
}
