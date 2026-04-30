import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import {
  notificationListResponseSchema,
  notificationRecordSchema,
  parseApiResponse,
} from '@/lib/api/schemas'
import type { NotificationListResponse, NotificationRecord } from '@/lib/types/api'

export const notificationsApi = {
  async list(input?: {
    unread?: boolean
    limit?: number
    cursor?: string | null
  }): Promise<NotificationListResponse> {
    const response = await apiClient.get<NotificationListResponse>('/v1/notifications', {
      params: {
        ...(input?.unread !== undefined ? { unread: String(input.unread) } : {}),
        ...(input?.limit ? { limit: input.limit } : {}),
        ...(input?.cursor ? { cursor: input.cursor } : {}),
      },
    })
    return parseApiResponse(notificationListResponseSchema, response.data)
  },

  async markRead(notificationId: string): Promise<{ notification: NotificationRecord }> {
    const response = await apiClient.patch<{ notification: NotificationRecord }>(
      `/v1/notifications/${notificationId}/read`
    )
    return parseApiResponse(z.object({ notification: notificationRecordSchema }), response.data)
  },

  async markAllRead(): Promise<{ updated: number }> {
    const response = await apiClient.patch<{ updated: number }>('/v1/notifications/read-all')
    return parseApiResponse(z.object({ updated: z.number() }), response.data)
  },

  async delete(notificationId: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete<{ deleted: boolean }>(
      `/v1/notifications/${notificationId}`
    )
    return parseApiResponse(z.object({ deleted: z.boolean() }), response.data)
  },
}
