'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { scimApi } from '@/lib/api/scim'
import { queryKeys } from '@/lib/query/keys'

function useInvalidateScimTokens() {
  const queryClient = useQueryClient()
  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.scimTokens.all })
  }, [queryClient])
}

export function useScimTokens(enabled = true) {
  return useQuery({
    queryKey: queryKeys.scimTokens.list(),
    queryFn: () => scimApi.list(),
    enabled,
  })
}

export function useIssueScimToken() {
  const invalidate = useInvalidateScimTokens()
  return useMutation({
    mutationFn: (label: string) => scimApi.issue(label),
    onSuccess: invalidate,
  })
}

export function useRevokeScimToken() {
  const invalidate = useInvalidateScimTokens()
  return useMutation({
    mutationFn: (tokenId: string) => scimApi.revoke(tokenId),
    onSuccess: invalidate,
  })
}
