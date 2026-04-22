'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { secretsApi } from '@/lib/api/secrets'
import type { CreateSecretInput } from '@/lib/types/api'

export function useProjectSecrets(projectId: string | null) {
  return useQuery({
    queryKey: ['project-secrets', projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to list secrets')
      }

      return secretsApi.listProjectSecrets(projectId).then((response) => response.secrets)
    },
    enabled: Boolean(projectId),
  })
}

export function useCreateSecrets() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      projectId: string
      secrets: Array<{ key: string; value: string }>
    }) => {
      return secretsApi.importSecrets({
        projectId: payload.projectId,
        environment: 'development',
        mode: 'compatibility',
        issueTokens: false,
        secrets: Object.fromEntries(payload.secrets.map((row) => [row.key, row.value])),
      })
    },
    onSuccess: async (_result, payload) => {
      await queryClient.invalidateQueries({ queryKey: ['project-secrets', payload.projectId] })
    },
  })
}

export function useDeleteSecret() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: secretsApi.deleteSecret,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-secrets', input.projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-tokens', input.projectId] }),
      ])
    },
  })
}

export function useUpdateSecret() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: secretsApi.updateSecret,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ['project-secrets', input.projectId] })
    },
  })
}

export function useSecrets() {
  const queryClient = useQueryClient()

  return {
    createSecret: useMutation({
      mutationFn: secretsApi.createSecret,
      onSuccess: async (_result, input: CreateSecretInput) => {
        await queryClient.invalidateQueries({ queryKey: ['project-secrets', input.projectId] })
      },
    }),
    importSecrets: useMutation({
      mutationFn: secretsApi.importSecrets,
      onSuccess: async (_result, input) => {
        await queryClient.invalidateQueries({ queryKey: ['project-secrets', input.projectId] })
      },
    }),
    updateSecret: useMutation({
      mutationFn: secretsApi.updateSecret,
      onSuccess: async (_result, input) => {
        await queryClient.invalidateQueries({ queryKey: ['project-secrets', input.projectId] })
      },
    }),
  }
}
