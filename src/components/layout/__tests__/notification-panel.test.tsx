import type { ReactNode } from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { NotificationPanel } from '../notification-panel'

const markReadMutate = jest.fn()
const markAllReadMutate = jest.fn()
const deleteNotificationMutate = jest.fn()
const acceptInvitationMutateAsync = jest.fn()
const rejectInvitationMutateAsync = jest.fn()
const reviewAccessRequestMutateAsync = jest.fn()
const routerPush = jest.fn()
let notificationsData: unknown
const setActiveOrganization = jest.fn()
const refreshAuth = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

jest.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    setActiveOrganization,
    refresh: refreshAuth,
  }),
}))

jest.mock('@/lib/hooks/use-notifications', () => ({
  useNotifications: () => ({
    data: notificationsData,
    isLoading: false,
  }),
  useMarkNotificationRead: () => ({
    mutate: markReadMutate,
  }),
  useMarkAllNotificationsRead: () => ({
    mutate: markAllReadMutate,
  }),
  useDeleteNotification: () => ({
    mutate: deleteNotificationMutate,
  }),
}))

jest.mock('@/lib/hooks/use-invitations', () => ({
  useAcceptInvitationById: () => ({
    mutateAsync: acceptInvitationMutateAsync,
    isPending: false,
  }),
  useRejectInvitationById: () => ({
    mutateAsync: rejectInvitationMutateAsync,
    isPending: false,
  }),
}))

jest.mock('@/lib/hooks/use-projects', () => ({
  useReviewProjectAccessRequest: () => ({
    mutateAsync: reviewAccessRequestMutateAsync,
    isPending: false,
  }),
}))

jest.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({
    toast: {
      success: jest.fn(),
      error: jest.fn(),
    },
  }),
}))

jest.mock('@/components/invitations/invitation-dialog', () => ({
  InvitationDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Invitation dialog</div> : null,
}))

jest.mock('@/components/ui/dropdown', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

describe('NotificationPanel', () => {
  beforeEach(() => {
    markReadMutate.mockReset()
    markAllReadMutate.mockReset()
    deleteNotificationMutate.mockReset()
    setActiveOrganization.mockResolvedValue(undefined)
    setActiveOrganization.mockClear()
    refreshAuth.mockResolvedValue(undefined)
    refreshAuth.mockClear()
    acceptInvitationMutateAsync.mockResolvedValue({})
    acceptInvitationMutateAsync.mockClear()
    rejectInvitationMutateAsync.mockResolvedValue({})
    rejectInvitationMutateAsync.mockClear()
    reviewAccessRequestMutateAsync.mockResolvedValue({})
    reviewAccessRequestMutateAsync.mockClear()
    routerPush.mockClear()
    notificationsData = {
      unreadCount: 1,
      nextCursor: null,
      notifications: [
        {
          id: 'notification_1',
          userId: 'user_1',
          type: 'org_invitation',
          title: 'Join Acme',
          body: 'You were invited to Acme.',
          data: {
            notificationAction: 'respond',
            invitationStatus: 'pending',
            invitationId: 'invitation_1',
            organizationName: 'Acme',
            invitedByName: 'Ada',
            email: 'user@example.com',
            role: 'developer',
          },
          readAt: null,
          actionTaken: null,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'notification_2',
          userId: 'user_1',
          type: 'project_access_approved',
          title: 'Access approved',
          body: 'You can now access Vault.',
          data: {},
          readAt: new Date().toISOString(),
          actionTaken: null,
          createdAt: new Date().toISOString(),
        },
      ],
    }
  })

  it('shows unread count badge and filters unread notifications', () => {
    render(<NotificationPanel />)

    expect(screen.getByLabelText('Notifications')).toHaveTextContent('1')
    expect(screen.getByText('Join Acme')).toBeInTheDocument()
    expect(screen.queryByText('Access approved')).not.toBeInTheDocument()
  })

  it('shows all notifications on the all tab', () => {
    render(<NotificationPanel />)

    fireEvent.click(screen.getByRole('button', { name: 'All' }))

    expect(screen.getByText('Join Acme')).toBeInTheDocument()
    expect(screen.getByText('Access approved')).toBeInTheDocument()
  })

  it('marks a notification as read and opens the invitation dialog on row click', () => {
    render(<NotificationPanel />)

    fireEvent.click(screen.getByText('Join Acme'))

    expect(markReadMutate).toHaveBeenCalledWith('notification_1')
    expect(screen.getByRole('dialog')).toHaveTextContent('Invitation dialog')
  })

  it('marks all notifications as read from the header action', () => {
    render(<NotificationPanel />)

    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }))

    expect(markAllReadMutate).toHaveBeenCalled()
  })

  it('accepts invitations from the inline tick button', async () => {
    acceptInvitationMutateAsync.mockResolvedValue({
      invitation: {
        organizationId: 'org_1',
      },
    })

    render(<NotificationPanel />)

    fireEvent.click(screen.getByRole('button', { name: 'Accept invitation' }))

    expect(acceptInvitationMutateAsync).toHaveBeenCalledWith('invitation_1')
    await waitFor(() => {
      expect(screen.getByText('Joined')).toBeInTheDocument()
    })
  })

  it('removes response actions immediately after declining an invitation', async () => {
    render(<NotificationPanel />)

    fireEvent.click(screen.getByRole('button', { name: 'Decline invitation' }))

    expect(rejectInvitationMutateAsync).toHaveBeenCalledWith('invitation_1')
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Decline invitation' })).not.toBeInTheDocument()
    expect(screen.getByText('Declined')).toBeInTheDocument()
  })

  it('does not show response actions for expired invitation notifications', () => {
    notificationsData = {
      unreadCount: 1,
      nextCursor: null,
      notifications: [
        {
          id: 'notification_expired',
          userId: 'user_1',
          type: 'org_invitation',
          title: 'Join Acme',
          body: 'You were invited to Acme.',
          data: {
            notificationAction: 'respond',
            invitationStatus: 'revoked',
            invitationId: 'invitation_1',
            organizationName: 'Acme',
            invitedByName: 'Ada',
            email: 'user@example.com',
            role: 'developer',
            expired: true,
          },
          readAt: null,
          actionTaken: 'dismissed',
          createdAt: new Date().toISOString(),
        },
      ],
    }

    render(<NotificationPanel />)

    expect(screen.getByText('Expired')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Decline invitation' })).not.toBeInTheDocument()
  })

  it('does not show invitation response actions on inviter status notifications', () => {
    notificationsData = {
      unreadCount: 1,
      nextCursor: null,
      notifications: [
        {
          id: 'notification_status',
          userId: 'admin_1',
          type: 'org_invitation',
          title: 'Invitation accepted',
          body: 'user@example.com accepted your organisation invitation.',
          data: {
            notificationAction: 'status',
            invitationId: 'invitation_1',
            organizationId: 'org_1',
            acceptedByUserId: 'user_1',
          },
          readAt: null,
          actionTaken: null,
          createdAt: new Date().toISOString(),
        },
      ],
    }

    render(<NotificationPanel />)

    expect(screen.getByText('Invitation accepted')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Decline invitation' })).not.toBeInTheDocument()
  })

  it('deletes notifications from the row action', () => {
    render(<NotificationPanel />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete notification: Join Acme' }))

    expect(deleteNotificationMutate).toHaveBeenCalledWith('notification_1')
  })

  it('navigates project access request notifications to the team page', () => {
    notificationsData = {
      unreadCount: 1,
      nextCursor: null,
      notifications: [
        {
          id: 'notification_access',
          userId: 'admin_1',
          type: 'project_access_request',
          title: 'Project access requested',
          body: 'Member requested access to Vault.',
          data: {
            notificationAction: 'review_project_access',
            requestId: 'access_request_1',
            requestStatus: 'pending',
            projectId: 'project_1',
            organizationId: 'org_1',
          },
          readAt: null,
          actionTaken: null,
          createdAt: new Date().toISOString(),
        },
      ],
    }

    render(<NotificationPanel />)

    fireEvent.click(screen.getByText('Project access requested'))

    expect(markReadMutate).toHaveBeenCalledWith('notification_access')
    expect(routerPush).toHaveBeenCalledWith('/dashboard/org/org_1/projects/project_1/team')
  })

  it('approves project access from the inline tick and then shows a status icon', async () => {
    notificationsData = {
      unreadCount: 1,
      nextCursor: null,
      notifications: [
        {
          id: 'notification_access',
          userId: 'admin_1',
          type: 'project_access_request',
          title: 'Project access requested',
          body: 'Member requested access to Vault.',
          data: {
            notificationAction: 'review_project_access',
            requestId: 'access_request_1',
            requestStatus: 'pending',
            projectId: 'project_1',
            organizationId: 'org_1',
          },
          readAt: null,
          actionTaken: null,
          createdAt: new Date().toISOString(),
        },
      ],
    }

    render(<NotificationPanel />)

    fireEvent.click(screen.getByRole('button', { name: 'Approve project access request' }))

    expect(reviewAccessRequestMutateAsync).toHaveBeenCalledWith({
      requestId: 'access_request_1',
      input: {
        status: 'approved',
        grantedRole: 'developer',
      },
    })
    await waitFor(() => {
      expect(screen.getByLabelText('Access request approved')).toBeInTheDocument()
    })
  })
})
