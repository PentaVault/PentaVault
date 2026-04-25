'use client'

import { useMemo, useState } from 'react'

import { formatDistanceToNow } from 'date-fns'
import { Bell, Check, Trash2, X } from 'lucide-react'

import { InvitationDialog } from '@/components/invitations/invitation-dialog'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown'
import { useAcceptInvitationById, useRejectInvitationById } from '@/lib/hooks/use-invitations'
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/hooks/use-notifications'
import { useToast } from '@/lib/hooks/use-toast'
import type { NotificationRecord, VerifyInvitationResponse } from '@/lib/types/api'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type NotificationTab = 'unread' | 'all'

function getString(data: Record<string, unknown>, key: string): string | null {
  const value = data[key]
  return typeof value === 'string' ? value : null
}

function getInvitationPayload(notification: NotificationRecord): VerifyInvitationResponse | null {
  if (notification.type !== 'org_invitation') {
    return null
  }

  return {
    valid: true,
    expired: Boolean(notification.data.expired),
    alreadyUsed: Boolean(notification.actionTaken),
    organizationName: getString(notification.data, 'organizationName'),
    invitedByName: getString(notification.data, 'invitedByName'),
    role: getString(notification.data, 'role') as VerifyInvitationResponse['role'],
    email: getString(notification.data, 'email'),
    expiresAt: getString(notification.data, 'expiresAt'),
  }
}

function NotificationRow({
  notification,
  onRead,
  onDelete,
}: {
  notification: NotificationRecord
  onRead: () => void
  onDelete: () => void
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const acceptInvitation = useAcceptInvitationById()
  const rejectInvitation = useRejectInvitationById()
  const { toast } = useToast()
  const invitation = getInvitationPayload(notification)
  const invitationId = getString(notification.data, 'invitationId')
  const canActOnInvitation =
    invitation && invitationId && !invitation.expired && !notification.actionTaken
  const isActing = acceptInvitation.isPending || rejectInvitation.isPending

  async function accept() {
    if (!invitationId) return

    try {
      await acceptInvitation.mutateAsync(invitationId)
      toast.success('Invitation accepted.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to accept this invitation.'))
    }
  }

  async function reject() {
    if (!invitationId) return

    try {
      await rejectInvitation.mutateAsync(invitationId)
      toast.success('Invitation declined.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to decline this invitation.'))
    }
  }

  return (
    <>
      <div
        className={cn(
          'group flex w-full cursor-pointer gap-3 border-b border-border px-5 py-4 text-left transition-colors last:border-0 hover:bg-card-elevated',
          !notification.readAt && 'bg-accent/5'
        )}
        onClick={() => {
          onRead()
          if (canActOnInvitation) {
            setDialogOpen(true)
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onRead()
            if (canActOnInvitation) {
              setDialogOpen(true)
            }
          }
        }}
        role="button"
        tabIndex={0}
      >
        <span
          className={cn(
            'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
            notification.readAt ? 'bg-transparent' : 'bg-accent'
          )}
        />

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-5">{notification.title}</span>
          <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">
            {notification.body}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
        </span>

        <span
          className="flex flex-shrink-0 items-center gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            aria-label={`Delete notification: ${notification.title}`}
            className="h-8 w-8 px-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            onClick={onDelete}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </span>

        {canActOnInvitation ? (
          <span
            className="flex flex-shrink-0 items-center gap-1"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              aria-label="Decline invitation"
              className="h-8 w-8 border-danger/35 px-0 text-danger hover:border-danger"
              disabled={isActing}
              onClick={() => void reject()}
              size="sm"
              type="button"
              variant="outline"
            >
              <X className="h-4 w-4 text-danger" />
            </Button>
            <Button
              aria-label="Accept invitation"
              className="h-8 w-8 border-accent/35 px-0 text-accent hover:border-accent"
              disabled={isActing}
              onClick={() => void accept()}
              size="sm"
              type="button"
              variant="outline"
            >
              <Check className="h-4 w-4 text-accent" />
            </Button>
          </span>
        ) : notification.actionTaken ? (
          <StatusBadge tone={notification.actionTaken === 'accepted' ? 'success' : 'neutral'}>
            {notification.actionTaken === 'accepted' ? 'Joined' : 'Declined'}
          </StatusBadge>
        ) : invitation?.expired ? (
          <StatusBadge tone="warning">Expired</StatusBadge>
        ) : null}
      </div>

      {canActOnInvitation ? (
        <InvitationDialog
          invite={invitation}
          invitationId={invitationId}
          onOpenChange={setDialogOpen}
          open={dialogOpen}
        />
      ) : null}
    </>
  )
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<NotificationTab>('unread')
  const notificationsQuery = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const deleteNotification = useDeleteNotification()
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0
  const displayed = useMemo(() => {
    const notifications = notificationsQuery.data?.notifications ?? []
    return tab === 'unread'
      ? notifications.filter((notification) => !notification.readAt)
      : notifications
  }, [notificationsQuery.data?.notifications, tab])

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-foreground transition-colors hover:border-border"
          type="button"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[28rem] max-w-[calc(100vw-1rem)] p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold">Notifications</h3>
          {unreadCount > 0 ? (
            <button
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => markAllRead.mutate()}
              type="button"
            >
              Mark all read
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 border-b border-border">
          {(['unread', 'all'] as const).map((value) => (
            <button
              className={cn(
                'border-b-2 px-3 py-2 text-xs font-medium capitalize transition-colors',
                tab === value
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              key={value}
              onClick={() => setTab(value)}
              type="button"
            >
              {value === 'unread' ? `Unread${unreadCount ? ` (${unreadCount})` : ''}` : 'All'}
            </button>
          ))}
        </div>

        <div className="max-h-[34rem] overflow-y-auto">
          {notificationsQuery.isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : displayed.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {tab === 'unread' ? 'No unread notifications' : 'No notifications'}
            </div>
          ) : (
            displayed.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onRead={() => {
                  if (!notification.readAt) {
                    markRead.mutate(notification.id)
                  }
                }}
                onDelete={() => deleteNotification.mutate(notification.id)}
              />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
