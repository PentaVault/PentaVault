'use client'

import { useMutation } from '@tanstack/react-query'

import { tokensApi } from '@/lib/api/tokens'

export function useTokens() {
  return {
    issueToken: useMutation({
      mutationFn: tokensApi.issueToken,
    }),
    resolveBulk: useMutation({
      mutationFn: tokensApi.resolveBulk,
    }),
    revokeToken: useMutation({
      mutationFn: tokensApi.revokeToken,
    }),
  }
}
