import { apiClient } from '@/lib/api/client'
import {
  createWebhookInputSchema,
  parseApiInput,
  parseApiResponse,
  updateWebhookInputSchema,
  webhookDeliveriesResponseSchema,
  webhookDeliveryResponseSchema,
  webhookResponseSchema,
  webhooksResponseSchema,
} from '@/lib/api/schemas'
import type {
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookDeliveriesResponse,
  WebhookDeliveryResponse,
  WebhookResponse,
  WebhooksResponse,
} from '@/lib/types/api'

export const webhooksApi = {
  async list(projectId: string): Promise<WebhooksResponse> {
    const response = await apiClient.get<WebhooksResponse>(`/v1/projects/${projectId}/webhooks`)
    return parseApiResponse(webhooksResponseSchema, response.data)
  },

  async create(projectId: string, input: CreateWebhookInput): Promise<WebhookResponse> {
    const response = await apiClient.post<WebhookResponse>(
      `/v1/projects/${projectId}/webhooks`,
      parseApiInput(createWebhookInputSchema, input)
    )
    return parseApiResponse(webhookResponseSchema, response.data)
  },

  async update(
    projectId: string,
    webhookId: string,
    input: UpdateWebhookInput
  ): Promise<WebhookResponse> {
    const response = await apiClient.patch<WebhookResponse>(
      `/v1/projects/${projectId}/webhooks/${webhookId}`,
      parseApiInput(updateWebhookInputSchema, input)
    )
    return parseApiResponse(webhookResponseSchema, response.data)
  },

  async remove(projectId: string, webhookId: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete<{ deleted: boolean }>(
      `/v1/projects/${projectId}/webhooks/${webhookId}`
    )
    return response.data
  },

  async test(projectId: string, webhookId: string): Promise<WebhookDeliveryResponse> {
    const response = await apiClient.post<WebhookDeliveryResponse>(
      `/v1/projects/${projectId}/webhooks/${webhookId}/test`
    )
    return parseApiResponse(webhookDeliveryResponseSchema, response.data)
  },

  async listDeliveries(
    projectId: string,
    webhookId?: string,
    limit = 50
  ): Promise<WebhookDeliveriesResponse> {
    const response = await apiClient.get<WebhookDeliveriesResponse>(
      `/v1/projects/${projectId}/webhook-deliveries`,
      { params: { webhookId, limit } }
    )
    return parseApiResponse(webhookDeliveriesResponseSchema, response.data)
  },

  async retry(projectId: string, deliveryId: string): Promise<WebhookDeliveryResponse> {
    const response = await apiClient.post<WebhookDeliveryResponse>(
      `/v1/projects/${projectId}/webhook-deliveries/${deliveryId}/retry`
    )
    return parseApiResponse(webhookDeliveryResponseSchema, response.data)
  },
}
