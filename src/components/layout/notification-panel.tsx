'use client'

import { formatDistanceToNow } from 'date-fns'
import { Bell, Check, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { InvitationDialog } from '@/components/invitations/invitation-dialog'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown'
import {
  getOrgProjectPath,
  getOrgProjectSecretsPath,
  getOrgProjectTeamPath,
  getProjectPath,
  getProjectSecretsPath,
  getProjectTeamPath,
} from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useAcceptInvitationById, useRejectInvitationById } from '@/lib/hooks/use-invitations'
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/hooks/use-notifications'
import { useReviewProjectAccessRequest } from '@/lib/hooks/use-projects'
import { useToast } from '@/lib/hooks/use-toast'
import type { NotificationRecord, VerifyInvitationResponse } from '@/lib/types/api'
import { cn } from '@/lib/utils/cn'
import { getApiErrorCode, getApiFriendlyMessage } from '@/lib/utils/errors'

type NotificationTab = 'unread' | 'all'
type InvitationNotificationAction =
  | 'accepted'
  | 'rejected'
  | 'dismissed'
  | 'expired'
  | 'unavailable'
  | null
type LocalInvitationAction = {
  notificationId: string
  action: InvitationNotificationAction
}
type ProjectAccessRequestNotificationAction =
  | 'approved'
  | 'rejected'
  | 'denied'
  | 'cancelled'
  | null
type LocalProjectAccessRequestAction = {
  notificationId: string
  action: ProjectAccessRequestNotificationAction
}

const EXPIRED_INVITATION_STATUSES = new Set(['expired', 'revoked', 'cancelled', 'canceled'])

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
    status: getString(notification.data, 'invitationStatus') as VerifyInvitationResponse['status'],
    organizationName: getString(notification.data, 'organizationName'),
    invitedByName: getString(notification.data, 'invitedByName'),
    role: getString(notification.data, 'role') as VerifyInvitationResponse['role'],
    email: getString(notification.data, 'email'),
    expiresAt: getString(notification.data, 'expiresAt'),
  }
}

function isActionableInvitationNotification(notification: NotificationRecord): boolean {
  if (notification.type !== 'org_invitation') {
    return false
  }

  const notificationAction = getString(notification.data, 'notificationAction')
  if (notificationAction) {
    return notificationAction === 'respond'
  }

  return Boolean(
    getString(notification.data, 'organizationName') &&
      getString(notification.data, 'invitedByName') &&
      getString(notification.data, 'role') &&
      getString(notification.data, 'email') &&
      getString(notification.data, 'expiresAt')
  )
}

function getInvitationStatus(notification: NotificationRecord): string | null {
  return getString(notification.data, 'invitationStatus')
}

function getEffectiveInvitationAction(
  notification: NotificationRecord,
  localAction: InvitationNotificationAction
): InvitationNotificationAction {
  if (localAction) {
    return localAction
  }

  if (
    notification.actionTaken === 'accepted' ||
    notification.actionTaken === 'rejected' ||
    notification.actionTaken === 'dismissed'
  ) {
    if (notification.actionTaken === 'dismissed') {
      return isExpiredInvitationNotification(notification) ? 'expired' : 'unavailable'
    }

    return notification.actionTaken
  }

  const status = getInvitationStatus(notification)
  if (status === 'accepted') {
    return 'accepted'
  }
  if (status === 'rejected') {
    return 'rejected'
  }
  if (status && EXPIRED_INVITATION_STATUSES.has(status)) {
    return 'expired'
  }

  return null
}

function isExpiredInvitationNotification(notification: NotificationRecord): boolean {
  const status = getInvitationStatus(notification)
  return (
    Boolean(notification.data.expired) || Boolean(status && EXPIRED_INVITATION_STATUSES.has(status))
  )
}

function InvitationStatusBadge({
  action,
  expired,
}: {
  action: InvitationNotificationAction
  expired: boolean
}) {
  if (action === 'accepted') {
    return <NotificationStateBadge tone="success">Joined</NotificationStateBadge>
  }

  if (action === 'rejected') {
    return <NotificationStateBadge tone="neutral">Declined</NotificationStateBadge>
  }

  if (expired || action === 'expired') {
    return <NotificationStateBadge tone="warning">Expired</NotificationStateBadge>
  }

  if (action === 'dismissed' || action === 'unavailable') {
    return <NotificationStateBadge tone="neutral">Unavailable</NotificationStateBadge>
  }

  return null
}

function NotificationStateBadge({
  children,
  tone,
}: {
  children: string
  tone: 'success' | 'warning' | 'danger' | 'neutral'
}) {
  return (
    <StatusBadge
      className="flex h-8 min-w-[6.5rem] items-center justify-center rounded-md px-2 text-[11px]"
      tone={tone}
    >
      {children}
    </StatusBadge>
  )
}

function NotificationIconAction({
  ariaLabel,
  disabled,
  icon,
  onClick,
  tone,
}: {
  ariaLabel: string
  disabled?: boolean
  icon: 'approve' | 'reject'
  onClick: () => void
  tone: 'success' | 'danger'
}) {
  const iconNode =
    icon === 'approve' ? (
      <Check className="h-4 w-4 text-accent" />
    ) : (
      <X className="h-4 w-4 text-danger" />
    )

  return (
    <Button
      aria-label={ariaLabel}
      className={cn(
        'h-8 w-8 rounded-md px-0',
        tone === 'success'
          ? 'border-accent/35 text-accent hover:border-accent'
          : 'border-danger/35 text-danger hover:border-danger'
      )}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      size="sm"
      type="button"
      variant="outline"
    >
      {iconNode}
    </Button>
  )
}

function getProjectAccessRequestAction(
  notification: NotificationRecord,
  localAction: ProjectAccessRequestNotificationAction
): ProjectAccessRequestNotificationAction {
  if (localAction) {
    return localAction
  }

  if (
    notification.actionTaken === 'approved' ||
    notification.actionTaken === 'rejected' ||
    notification.actionTaken === 'denied'
  ) {
    return notification.actionTaken
  }

  const status = getString(notification.data, 'requestStatus')
  if (status === 'approved' || status === 'rejected' || status === 'denied') {
    return status
  }

  if (status === 'cancelled') {
    return 'cancelled'
  }

  return null
}

function getProjectAccessRequestHref(notification: NotificationRecord): string | null {
  const projectId = getString(notification.data, 'projectId')
  if (!projectId) {
    return null
  }

  const organizationId = getString(notification.data, 'organizationId')
  return organizationId
    ? getOrgProjectTeamPath(organizationId, projectId)
    : getProjectTeamPath(projectId)
}

function getProjectNotificationHref(notification: NotificationRecord): string | null {
  const projectId = getString(notification.data, 'projectId')
  if (!projectId) {
    return null
  }

  const organizationId = getString(notification.data, 'organizationId')
  const notificationAction = getString(notification.data, 'notificationAction')

  if (
    notification.type === 'secret_access_request' ||
    notificationAction === 'review_secret_access'
  ) {
    return organizationId
      ? getOrgProjectSecretsPath(organizationId, projectId)
      : getProjectSecretsPath(projectId)
  }

  if (notification.type === 'project_access_request') {
    return organizationId
      ? getOrgProjectTeamPath(organizationId, projectId)
      : getProjectTeamPath(projectId)
  }

  if (notification.type === 'project_access_approved') {
    return organizationId ? getOrgProjectPath(organizationId, projectId) : getProjectPath(projectId)
  }

  return null
}

function ProjectAccessRequestStatusIcon({
  action,
}: {
  action: ProjectAccessRequestNotificationAction
}) {
  if (action === 'approved') {
    return <NotificationStateBadge tone="success">Approved</NotificationStateBadge>
  }

  if (action === 'rejected' || action === 'denied' || action === 'cancelled') {
    return <NotificationStateBadge tone="danger">Declined</NotificationStateBadge>
  }

  return null
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
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [localAction, setLocalAction] = useState<LocalInvitationAction | null>(null)
  const [localProjectAction, setLocalProjectAction] =
    useState<LocalProjectAccessRequestAction | null>(null)
  const acceptInvitation = useAcceptInvitationById()
  const rejectInvitation = useRejectInvitationById()
  const projectId = getString(notification.data, 'projectId')
  const reviewProjectAccessRequest = useReviewProjectAccessRequest(projectId)
  const auth = useAuth()
  const { toast } = useToast()
  const invitation = getInvitationPayload(notification)
  const invitationId = getString(notification.data, 'invitationId')
  const notificationLocalAction =
    localAction?.notificationId === notification.id ? localAction.action : null
  const effectiveAction = getEffectiveInvitationAction(notification, notificationLocalAction)
  const invitationExpired =
    isExpiredInvitationNotification(notification) || Boolean(invitation?.expired)
  const canActOnInvitation =
    isActionableInvitationNotification(notification) &&
    invitation &&
    invitationId &&
    !invitationExpired &&
    !effectiveAction
  const requestId = getString(notification.data, 'requestId')
  const projectRequestLocalAction =
    localProjectAction?.notificationId === notification.id ? localProjectAction.action : null
  const projectRequestAction = getProjectAccessRequestAction(
    notification,
    projectRequestLocalAction
  )
  const projectRequestHref = getProjectAccessRequestHref(notification)
  const notificationHref = getProjectNotificationHref(notification) ?? projectRequestHref
  const canReviewProjectRequest =
    notification.type === 'project_access_request' &&
    Boolean(requestId && projectId) &&
    !projectRequestAction
  const invitationIsActing = acceptInvitation.isPending || rejectInvitation.isPending
  const projectRequestIsActing = reviewProjectAccessRequest.isPending

  function setNotificationLocalAction(action: Exclude<InvitationNotificationAction, null>) {
    setLocalAction({ notificationId: notification.id, action })
  }

  function setProjectRequestLocalAction(
    action: Exclude<ProjectAccessRequestNotificationAction, null>
  ) {
    setLocalProjectAction({ notificationId: notification.id, action })
  }

  async function accept() {
    if (!invitationId) return

    try {
      const result = await acceptInvitation.mutateAsync(invitationId)
      try {
        await auth.setActiveOrganization({ organizationId: result.invitation.organizationId })
      } catch {
        await auth.refresh()
      }
      setNotificationLocalAction('accepted')
      setDialogOpen(false)
      toast.success('Invitation accepted.')
    } catch (error) {
      const code = getApiErrorCode(error)
      if (code === 'INVITATION_EXPIRED') {
        setNotificationLocalAction('expired')
      } else if (code === 'INVITATION_ALREADY_USED') {
        setNotificationLocalAction('unavailable')
      }
      toast.error(getApiFriendlyMessage(error, 'Unable to accept this invitation.'))
    }
  }

  async function reject() {
    if (!invitationId) return

    try {
      await rejectInvitation.mutateAsync(invitationId)
      setNotificationLocalAction('rejected')
      setDialogOpen(false)
      toast.success('Invitation declined.')
    } catch (error) {
      const code = getApiErrorCode(error)
      if (code === 'INVITATION_EXPIRED') {
        setNotificationLocalAction('expired')
      } else if (code === 'INVITATION_ALREADY_USED') {
        setNotificationLocalAction('unavailable')
      }
      toast.error(getApiFriendlyMessage(error, 'Unable to decline this invitation.'))
    }
  }

  async function reviewProjectRequest(status: 'approved' | 'rejected'): Promise<void> {
    if (!requestId) return

    try {
      await activateNotificationOrganization()
      await reviewProjectAccessRequest.mutateAsync({
        requestId,
        input: {
          status,
          ...(status === 'approved'
            ? { grantedRole: 'member' }
            : { reviewerNote: 'Declined from notification review.' }),
        },
      })
      setProjectRequestLocalAction(status)
      toast.success(status === 'approved' ? 'Access request approved.' : 'Access request declined.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to review this access request.'))
    }
  }

  async function activateNotificationOrganization(): Promise<void> {
    const organizationId = getString(notification.data, 'organizationId')
    if (!organizationId) {
      return
    }

    try {
      await auth.setActiveOrganization({ organizationId })
    } catch {
      await auth.refresh()
    }
  }

  async function openNotificationTarget() {
    onRead()
    if (canActOnInvitation) {
      setDialogOpen(true)
      return
    }

    if (notificationHref) {
      await activateNotificationOrganization()
      router.push(notificationHref)
    }
  }

  return (
    <>
      <div
        className={cn(
          'group relative w-full cursor-pointer border-b border-border px-5 py-4 text-left transition-colors last:border-0 hover:bg-card-elevated',
          !notification.readAt && 'bg-accent/5'
        )}
        onClick={() => {
          void openNotificationTarget()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            void openNotificationTarget()
          }
        }}
        role="link"
        tabIndex={0}
      >
        <div className="pr-28 pb-10">
          <div className="flex gap-3">
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
              <span className="mt-2 block text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </span>
            </span>
          </div>
        </div>

        <div className="absolute top-4 right-5 flex min-h-8 min-w-[6.5rem] items-start justify-end">
          {canActOnInvitation ? (
            <span className="flex items-center gap-1">
              <NotificationIconAction
                ariaLabel="Decline invitation"
                disabled={invitationIsActing}
                icon="reject"
                onClick={() => void reject()}
                tone="danger"
              />
              <NotificationIconAction
                ariaLabel="Accept invitation"
                disabled={invitationIsActing}
                icon="approve"
                onClick={() => void accept()}
                tone="success"
              />
            </span>
          ) : canReviewProjectRequest ? (
            <span className="flex items-center gap-1">
              <NotificationIconAction
                ariaLabel="Decline project access request"
                disabled={projectRequestIsActing}
                icon="reject"
                onClick={() => void reviewProjectRequest('rejected')}
                tone="danger"
              />
              <NotificationIconAction
                ariaLabel="Approve project access request"
                disabled={projectRequestIsActing}
                icon="approve"
                onClick={() => void reviewProjectRequest('approved')}
                tone="success"
              />
            </span>
          ) : notification.type === 'project_access_request' ? (
            <ProjectAccessRequestStatusIcon action={projectRequestAction} />
          ) : (
            <InvitationStatusBadge action={effectiveAction} expired={invitationExpired} />
          )}
        </div>

        <div className="absolute right-5 bottom-4">
          <Button
            aria-label={`Delete notification: ${notification.title}`}
            className="h-8 w-8 rounded-md px-0 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100"
            onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {canActOnInvitation ? (
        <InvitationDialog
          invite={invitation}
          invitationId={invitationId}
          onAccepted={() => setNotificationLocalAction('accepted')}
          onOpenChange={setDialogOpen}
          onRejected={() => setNotificationLocalAction('rejected')}
          onUnavailable={(reason) =>
            setNotificationLocalAction(reason === 'expired' ? 'expired' : 'unavailable')
          }
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
