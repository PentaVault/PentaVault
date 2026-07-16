'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { webhooksApi } from '@/lib/api/webhooks'
import { queryKeys } from '@/lib/query/keys'
import type { CreateWebhookInput, UpdateWebhookInput } from '@/lib/types/api'

export function useProjectWebhooks(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectWebhooks.list(projectId),
    queryFn: async () => {
      if (!projectId) throw new Error('projectId is required to list webhooks')
      return webhooksApi.list(projectId)
    },
    enabled: enabled && Boolean(projectId),
  })
}

export function useWebhookDeliveries(
  projectId: string | null,
  webhookId?: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.projectWebhooks.deliveries(projectId, webhookId),
    queryFn: async () => {
      if (!projectId) throw new Error('projectId is required to list webhook deliveries')
      return webhooksApi.listDeliveries(projectId, webhookId ?? undefined)
    },
    enabled: enabled && Boolean(projectId),
    refetchInterval: enabled ? 15_000 : false,
  })
}

function useInvalidateWebhooks(projectId: string | null) {
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.projectWebhooks.list(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projectWebhooks.all }),
    ])
  }
}

export function useCreateWebhook(projectId: string | null) {
  const invalidate = useInvalidateWebhooks(projectId)
  return useMutation({
    mutationFn: async (input: CreateWebhookInput) => {
      if (!projectId) throw new Error('projectId is required to create a webhook')
      return webhooksApi.create(projectId, input)
    },
    onSuccess: invalidate,
  })
}

export function useUpdateWebhook(projectId: string | null) {
  const invalidate = useInvalidateWebhooks(projectId)
  return useMutation({
    mutationFn: async (payload: { webhookId: string; input: UpdateWebhookInput }) => {
      if (!projectId) throw new Error('projectId is required to update a webhook')
      return webhooksApi.update(projectId, payload.webhookId, payload.input)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteWebhook(projectId: string | null) {
  const invalidate = useInvalidateWebhooks(projectId)
  return useMutation({
    mutationFn: async (webhookId: string) => {
      if (!projectId) throw new Error('projectId is required to delete a webhook')
      return webhooksApi.remove(projectId, webhookId)
    },
    onSuccess: invalidate,
  })
}

export function useTestWebhook(projectId: string | null) {
  const invalidate = useInvalidateWebhooks(projectId)
  return useMutation({
    mutationFn: async (webhookId: string) => {
      if (!projectId) throw new Error('projectId is required to test a webhook')
      return webhooksApi.test(projectId, webhookId)
    },
    onSuccess: invalidate,
  })
}

export function useRetryWebhookDelivery(projectId: string | null) {
  const invalidate = useInvalidateWebhooks(projectId)
  return useMutation({
    mutationFn: async (deliveryId: string) => {
      if (!projectId) throw new Error('projectId is required to retry a webhook delivery')
      return webhooksApi.retry(projectId, deliveryId)
    },
    onSuccess: invalidate,
  })
}
