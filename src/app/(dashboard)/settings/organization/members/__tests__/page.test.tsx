import { fireEvent, render, screen } from '@testing-library/react'

import OrganizationMembersPage from '../page'

let actorRole = 'owner'

const members = [
  {
    membership: {
      id: 'member_owner',
      userId: 'user_owner',
      role: 'owner',
      memberType: 'member',
      expiresAt: null,
    },
    user: {
      id: 'user_owner',
      name: 'Owner User',
      username: 'owner-user',
      email: 'owner@example.com',
      image: null,
    },
  },
  {
    membership: {
      id: 'member_admin',
      userId: 'user_admin',
      role: 'admin',
      memberType: 'member',
      expiresAt: null,
    },
    user: {
      id: 'user_admin',
      name: 'Admin User',
      username: 'admin-user',
      email: 'admin@example.com',
      image: null,
    },
  },
  {
    membership: {
      id: 'member_developer',
      userId: 'user_developer',
      role: 'developer',
      memberType: 'member',
      expiresAt: null,
    },
    user: {
      id: 'user_developer',
      name: 'Member User',
      username: 'member-user',
      email: 'member@example.com',
      image: null,
    },
  },
]
const revokeInvitationMutateAsync = jest.fn()

jest.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    session: {
      user: {
        id: 'user_owner',
      },
    },
    activeOrganization: {
      organization: {
        id: 'org_1',
        name: 'Acme',
      },
      membership: {
        role: actorRole,
      },
    },
  }),
}))

jest.mock('@/lib/hooks/use-team', () => ({
  useOrganizationMembers: () => ({
    data: {
      members,
      invitations: [
        {
          id: 'invite_old',
          email: 'new@example.com',
          role: 'developer',
          status: 'rejected',
          expiresAt: null,
          createdAt: '2026-04-20T00:00:00.000Z',
          updatedAt: '2026-04-20T00:00:00.000Z',
          inviterId: 'user_owner',
          memberType: 'member',
          acceptedByUserId: null,
        },
        {
          id: 'invite_new',
          email: 'new@example.com',
          role: 'developer',
          status: 'pending',
          expiresAt: '2026-05-01T00:00:00.000Z',
          createdAt: '2026-04-25T00:00:00.000Z',
          updatedAt: '2026-04-25T00:00:00.000Z',
          inviterId: 'user_owner',
          memberType: 'member',
          acceptedByUserId: null,
        },
        {
          id: 'invite_joined',
          email: 'joined@example.com',
          role: 'developer',
          status: 'accepted',
          expiresAt: null,
          createdAt: '2026-04-25T00:00:00.000Z',
          updatedAt: '2026-04-25T00:00:00.000Z',
          inviterId: 'user_owner',
          memberType: 'member',
          acceptedByUserId: 'user_joined',
        },
      ],
    },
    isLoading: false,
  }),
  useUpdateOrganizationMember: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useRemoveOrganizationMember: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}))

jest.mock('@/lib/hooks/use-invitations', () => ({
  useSendOrgInvitation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useRevokeInvitation: () => ({
    mutateAsync: revokeInvitationMutateAsync,
    isPending: false,
  }),
  useResendInvitation: () => ({
    mutateAsync: jest.fn(),
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

describe('OrganizationMembersPage', () => {
  beforeEach(() => {
    actorRole = 'owner'
    revokeInvitationMutateAsync.mockResolvedValue({})
    revokeInvitationMutateAsync.mockClear()
  })

  it('hides user IDs for organization members', () => {
    render(<OrganizationMembersPage />)

    expect(screen.queryByText('user_owner')).not.toBeInTheDocument()
    expect(screen.queryByText('user_admin')).not.toBeInTheDocument()
    expect(screen.queryByText('user_developer')).not.toBeInTheDocument()
  })

  it('deduplicates invitation statuses into the member list', () => {
    render(<OrganizationMembersPage />)

    expect(screen.getAllByText('new@example.com')).toHaveLength(1)
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.queryByText('declined')).not.toBeInTheDocument()
    expect(screen.queryByText('joined@example.com')).not.toBeInTheDocument()
    expect(screen.queryByText('joined')).not.toBeInTheDocument()
    expect(screen.queryByText('Invitations')).not.toBeInTheDocument()
  })

  it('removes invitation messages from the member list', () => {
    render(<OrganizationMembersPage />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove invitation message for new@example.com' })
    )

    expect(revokeInvitationMutateAsync).toHaveBeenCalledWith('invite_new')
  })

  it('allows owners to remove other members but not themselves', () => {
    render(<OrganizationMembersPage />)

    expect(screen.getByRole('button', { name: 'Leave organisation' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Remove Admin User' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Remove Member User' })).toBeEnabled()
  })

  it('allows admins to remove lower privilege members only', () => {
    actorRole = 'admin'

    render(<OrganizationMembersPage />)

    expect(screen.getByRole('button', { name: 'Leave organisation' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Remove Admin User' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove Member User' })).toBeEnabled()
  })
})
