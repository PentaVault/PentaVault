'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { ssoApi } from '@/lib/api/sso'
import { queryKeys } from '@/lib/query/keys'
import type { CreateSsoConnectionInput, UpdateSsoConnectionInput } from '@/lib/types/api'

function useInvalidateSsoConnections() {
  const queryClient = useQueryClient()
  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.ssoConnections.all })
  }, [queryClient])
}

export function useSsoConnections(enabled = true) {
  return useQuery({
    queryKey: queryKeys.ssoConnections.list(),
    queryFn: () => ssoApi.list(),
    enabled,
  })
}

export function useCreateSsoConnection() {
  const invalidate = useInvalidateSsoConnections()
  return useMutation({
    mutationFn: (input: CreateSsoConnectionInput) => ssoApi.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateSsoConnection() {
  const invalidate = useInvalidateSsoConnections()
  return useMutation({
    mutationFn: (payload: { connectionId: string; input: UpdateSsoConnectionInput }) =>
      ssoApi.update(payload.connectionId, payload.input),
    onSuccess: invalidate,
  })
}

export function useDeleteSsoConnection() {
  const invalidate = useInvalidateSsoConnections()
  return useMutation({
    mutationFn: (connectionId: string) => ssoApi.remove(connectionId),
    onSuccess: invalidate,
  })
}

/**
 * Verification is a read-only diagnostic, so it deliberately does not
 * invalidate the connection list.
 */
export function useVerifySsoConnection() {
  return useMutation({
    mutationFn: (payload: { connectionId: string; idToken: string; nonce: string }) =>
      ssoApi.verify(payload.connectionId, { idToken: payload.idToken, nonce: payload.nonce }),
  })
}
