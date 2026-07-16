'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { secretsApi } from '@/lib/api/secrets'
import { queryKeys } from '@/lib/query/keys'
import type { CreateSecretInput } from '@/lib/types/api'

export function useProjectSecrets(
  projectId: string | null,
  enabled = true,
  configId?: string | null
) {
  return useQuery({
    queryKey: queryKeys.projectSecrets.list(projectId, configId),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to list secrets')
      }

      return secretsApi.listProjectSecrets(projectId, configId).then((response) => response.secrets)
    },
    enabled: Boolean(projectId) && enabled,
  })
}

export function useProjectSecretAccess(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectSecrets.access(projectId),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to list secret access')
      }

      return secretsApi.listProjectSecretAccess(projectId).then((response) => response.access)
    },
    enabled: Boolean(projectId) && enabled,
  })
}

export function useSecretAccessRequests(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectSecrets.accessRequests(projectId),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to list secret access requests')
      }

      return secretsApi.listSecretAccessRequests(projectId).then((response) => response.requests)
    },
    enabled: Boolean(projectId) && enabled,
  })
}

export function useSecretAccess(projectId: string | null, secretId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectSecrets.secretAccess(projectId, secretId),
    queryFn: async () => {
      if (!projectId || !secretId) {
        throw new Error('projectId and secretId are required to list secret access')
      }

      return secretsApi
        .listSecretAccess({ projectId, secretId })
        .then((response) => response.access)
    },
    enabled: Boolean(projectId && secretId) && enabled,
  })
}

export function useSecretVersions(
  projectId: string | null,
  secretId: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.projectSecrets.versions(projectId, secretId),
    queryFn: async () => {
      if (!projectId || !secretId) {
        throw new Error('projectId and secretId are required to list secret versions')
      }

      return secretsApi
        .listSecretVersions({ projectId, secretId })
        .then((response) => response.versions)
    },
    enabled: Boolean(projectId && secretId) && enabled,
  })
}

export function useCreateSecrets() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      projectId: string
      environment?: string
      environmentId?: string
      configId?: string
      encryptionMode?: CreateSecretInput['encryptionMode']
      description?: string | null
      folderPath?: string
      tags?: string[]
      scope?: CreateSecretInput['scope']
      secrets: Array<{ key: string; value: string }>
    }) => {
      return secretsApi.importSecrets({
        projectId: payload.projectId,
        environment: payload.environment ?? 'development',
        encryptionMode: payload.encryptionMode,
        scope: payload.scope ?? 'project',
        mode: 'compatibility',
        issueTokens: false,
        secrets: Object.fromEntries(payload.secrets.map((row) => [row.key, row.value])),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.folderPath !== undefined ? { folderPath: payload.folderPath } : {}),
        ...(payload.tags !== undefined ? { tags: payload.tags } : {}),
        ...(payload.environmentId ? { environmentId: payload.environmentId } : {}),
        ...(payload.configId ? { configId: payload.configId } : {}),
      })
    },
    onSuccess: async (_result, payload) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectSecrets.list(payload.projectId, payload.configId),
      })
    },
  })
}

export function useGrantSecretAccess() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: secretsApi.grantSecretAccess,
    onSuccess: async (_result, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.access(payload.projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.secretAccess(payload.projectId, payload.secretId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectTokens.list(payload.projectId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.accessRequests(payload.projectId),
        }),
      ])
    },
  })
}

export function useRevokeSecretAccess() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: secretsApi.revokeSecretAccess,
    onSuccess: async (_result, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.access(payload.projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.secretAccess(payload.projectId, payload.secretId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectTokens.list(payload.projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.accessRequests(payload.projectId),
        }),
      ])
    },
  })
}

export function useRejectSecretAccessRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: secretsApi.rejectSecretAccessRequest,
    onSuccess: async (_result, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.access(payload.projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.secretAccess(payload.projectId, payload.secretId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.accessRequests(payload.projectId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
      ])
    },
  })
}

export function useCancelSecretAccessRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: secretsApi.cancelSecretAccessRequest,
    onSuccess: async (_result, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.accessRequests(payload.projectId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
      ])
    },
  })
}

export function useApprovePromotionRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: secretsApi.approvePromotionRequest,
    onSuccess: async (_result, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.promotionRequests(payload.projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.list(payload.projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.personal(payload.projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.access(payload.projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectTokens.list(payload.projectId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
      ])
    },
  })
}

export function useRejectPromotionRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: secretsApi.rejectPromotionRequest,
    onSuccess: async (_result, payload) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectSecrets.promotionRequests(payload.projectId),
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

export function useDeleteSecret() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: secretsApi.deleteSecret,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.projectSecrets.list(input.projectId) }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.personal(input.projectId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projectTokens.list(input.projectId) }),
      ])
    },
  })
}

export function useUpdateSecret() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: secretsApi.updateSecret,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.list(input.projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.personal(input.projectId),
        }),
      ])
    },
  })
}

export function useUpdateSecretMetadata() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: secretsApi.updateSecretMetadata,
    onSuccess: async (_response, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.list(input.projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.personal(input.projectId),
        }),
      ])
    },
  })
}

export function useRestoreSecretVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: secretsApi.restoreSecretVersion,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.list(input.projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.versions(input.projectId, input.secretId),
        }),
      ])
    },
  })
}

export function useSecrets() {
  const queryClient = useQueryClient()

  return {
    createSecret: useMutation({
      mutationFn: secretsApi.createSecret,
      onSuccess: async (_result, input: CreateSecretInput) => {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.list(input.projectId),
        })
      },
    }),
    importSecrets: useMutation({
      mutationFn: secretsApi.importSecrets,
      onSuccess: async (_result, input) => {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.list(input.projectId),
        })
      },
    }),
    updateSecret: useMutation({
      mutationFn: secretsApi.updateSecret,
      onSuccess: async (_result, input) => {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.list(input.projectId),
        })
      },
    }),
  }
}
