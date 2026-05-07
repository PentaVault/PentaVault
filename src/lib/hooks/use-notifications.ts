'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { notificationsApi } from '@/lib/api/notifications'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/lib/hooks/use-toast'
import { queryKeys } from '@/lib/query/keys'
import type { NotificationListResponse, NotificationRecord } from '@/lib/types/api'

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => notificationsApi.list(),
    staleTime: 30_000,
  })
}

export function useNotificationStream() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { toast } = useToast()
  const userId = session?.user.id

  useEffect(() => {
    if (!userId) {
      return undefined
    }

    let source: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let retryDelay = 5000

    function connect() {
      source = new EventSource('/api/v1/notifications/stream', { withCredentials: true })

      source.addEventListener('notification', (event) => {
        const notification = JSON.parse(event.data) as NotificationRecord
        queryClient.setQueryData<NotificationListResponse>(queryKeys.notifications.all, (old) => {
          if (!old) {
            return { notifications: [notification], unreadCount: 1, nextCursor: null }
          }

          if (old.notifications.some((entry) => entry.id === notification.id)) {
            return old
          }

          return {
            ...old,
            notifications: [notification, ...old.notifications],
            unreadCount: old.unreadCount + 1,
          }
        })

        if (['org_invitation', 'project_access_approved'].includes(notification.type)) {
          toast(notification.title, { description: notification.body })
        }
      })

      source.addEventListener('connected', () => {
        retryDelay = 5000
      })

      source.onerror = () => {
        source?.close()
        retryTimer = setTimeout(connect, retryDelay)
        retryDelay = Math.min(retryDelay * 2, 30000)
      }
    }

    connect()

    return () => {
      if (retryTimer) {
        clearTimeout(retryTimer)
      }
      source?.close()
    }
  }, [queryClient, toast, userId])
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markRead(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.delete(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}
