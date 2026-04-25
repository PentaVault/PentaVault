import { apiClient } from '@/lib/api/client'
import type { NotificationListResponse, NotificationRecord } from '@/lib/types/api'

export const notificationsApi = {
  async list(input?: { unread?: boolean; limit?: number; cursor?: string | null }) {
    const response = await apiClient.get<NotificationListResponse>('/v1/notifications', {
      params: {
        ...(input?.unread !== undefined ? { unread: String(input.unread) } : {}),
        ...(input?.limit ? { limit: input.limit } : {}),
        ...(input?.cursor ? { cursor: input.cursor } : {}),
      },
    })
    return response.data
  },

  async markRead(notificationId: string): Promise<{ notification: NotificationRecord }> {
    const response = await apiClient.patch<{ notification: NotificationRecord }>(
      `/v1/notifications/${notificationId}/read`
    )
    return response.data
  },

  async markAllRead(): Promise<{ updated: number }> {
    const response = await apiClient.patch<{ updated: number }>('/v1/notifications/read-all')
    return response.data
  },

  async delete(notificationId: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete<{ deleted: boolean }>(
      `/v1/notifications/${notificationId}`
    )
    return response.data
  },
}
