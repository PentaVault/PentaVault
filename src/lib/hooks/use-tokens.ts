'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { tokensApi } from '@/lib/api/tokens'
import type { BatchIssueTokensInput, IssueTokenInput, RevokeTokenInput } from '@/lib/types/api'

export function useProjectTokens(projectId: string | null) {
  return useQuery({
    queryKey: ['project-tokens', projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to list tokens')
      }

      return tokensApi.listProjectTokens(projectId).then((response) => response.tokens)
    },
    enabled: Boolean(projectId),
  })
}

export function useGenerateToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: IssueTokenInput & { projectId: string }) =>
      tokensApi.issueToken(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ['project-tokens', input.projectId] })
    },
  })
}

export function useGenerateTokensForMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: BatchIssueTokensInput) => tokensApi.batchIssueTokens(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ['project-tokens', input.projectId] })
    },
  })
}

export function useRevokeToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RevokeTokenInput & { projectId: string }) => {
      if ('token' in input && input.token) {
        return tokensApi.revokeToken({ token: input.token, projectId: input.projectId })
      }

      if ('tokenHash' in input && input.tokenHash) {
        return tokensApi.revokeToken({ tokenHash: input.tokenHash, projectId: input.projectId })
      }

      throw new Error('token or tokenHash is required')
    },
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ['project-tokens', input.projectId] })
    },
  })
}

export function useTokens() {
  const queryClient = useQueryClient()

  return {
    issueToken: useMutation({
      mutationFn: tokensApi.issueToken,
      onSuccess: async (_result, input) => {
        await queryClient.invalidateQueries({ queryKey: ['project-tokens'] })
        await queryClient.invalidateQueries({ queryKey: ['project-secrets'] })
        await queryClient.invalidateQueries({ queryKey: ['project', input.secretId] })
      },
    }),
    resolveBulk: useMutation({
      mutationFn: tokensApi.resolveBulk,
    }),
    revokeToken: useMutation({
      mutationFn: tokensApi.revokeToken,
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ['project-tokens'] })
      },
    }),
  }
}
