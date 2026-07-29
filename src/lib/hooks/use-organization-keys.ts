'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { organizationKeysApi } from '@/lib/api/organization-keys'
import { queryKeys } from '@/lib/query/keys'
import type { CreateOrganizationEncryptionKeyInput } from '@/lib/types/api'

function useInvalidateOrganizationKeys() {
  const queryClient = useQueryClient()
  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.organizationEncryptionKeys.all })
  }, [queryClient])
}

export function useOrganizationEncryptionKeys(enabled = true) {
  return useQuery({
    queryKey: queryKeys.organizationEncryptionKeys.list(),
    queryFn: () => organizationKeysApi.list(),
    enabled,
  })
}

export function useAdoptOrganizationEncryptionKey() {
  const invalidate = useInvalidateOrganizationKeys()
  return useMutation({
    mutationFn: (input: CreateOrganizationEncryptionKeyInput) => organizationKeysApi.adopt(input),
    onSuccess: invalidate,
  })
}

export function useRewrapOrganizationEncryptionKey() {
  const invalidate = useInvalidateOrganizationKeys()
  return useMutation({
    mutationFn: (keyId: string) => organizationKeysApi.rewrap(keyId),
    onSuccess: invalidate,
  })
}

export function useSetOrganizationEncryptionKeyActive() {
  const invalidate = useInvalidateOrganizationKeys()
  return useMutation({
    mutationFn: (payload: { keyId: string; active: boolean }) =>
      organizationKeysApi.setActive(payload.keyId, payload.active),
    onSuccess: invalidate,
  })
}
