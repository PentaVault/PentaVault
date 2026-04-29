import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import InvitationPage from '../page'

const routerReplace = vi.fn()
let authState: unknown
let invitationState: unknown
const acceptMutateAsync = vi.fn()
const rejectMutateAsync = vi.fn()
const setActiveOrganization = vi.fn()

vi.mock('next/navigation', () => ({
  useParams: () => ({
    token: 'token_1',
  }),
  useRouter: () => ({
    replace: routerReplace,
  }),
}))

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => authState,
}))

vi.mock('@/lib/hooks/use-invitations', () => ({
  useVerifyInvitation: () => invitationState,
  useAcceptInvitation: () => ({
    mutateAsync: acceptMutateAsync,
    isPending: false,
  }),
  useAcceptInvitationById: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRejectInvitation: () => ({
    mutateAsync: rejectMutateAsync,
    isPending: false,
  }),
  useRejectInvitationById: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }),
}))

const validInvite = {
  valid: true,
  expired: false,
  alreadyUsed: false,
  status: 'pending',
  organizationName: 'Acme',
  invitedByName: 'Ada',
  role: 'developer',
  email: 'user@example.com',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
}

describe('InvitationPage', () => {
  beforeEach(() => {
    routerReplace.mockReset()
    acceptMutateAsync.mockReset()
    rejectMutateAsync.mockReset()
    authState = {
      session: null,
      refresh: vi.fn(),
      setActiveOrganization,
    }
    setActiveOrganization.mockResolvedValue(undefined)
    setActiveOrganization.mockClear()
    acceptMutateAsync.mockResolvedValue({ invitation: { organizationId: 'org_1' } })
    invitationState = {
      data: validInvite,
      isLoading: false,
      isError: false,
    }
  })

  it('shows auth options when the user is not signed in', () => {
    render(<InvitationPage />)

    expect(screen.getByRole('link', { name: 'Sign in to accept' })).toHaveAttribute(
      'href',
      '/login?invitation=token_1&email=user%40example.com'
    )
    expect(screen.getByRole('link', { name: 'Create account to accept' })).toBeInTheDocument()
  })

  it('shows accept and decline controls for a matching signed-in user', () => {
    authState = {
      session: {
        user: {
          email: 'user@example.com',
        },
      },
      refresh: vi.fn(),
      setActiveOrganization,
    }

    render(<InvitationPage />)

    expect(screen.getByRole('button', { name: 'Accept invite' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument()
  })

  it('switches to the joined organisation after accepting', async () => {
    authState = {
      session: {
        user: {
          email: 'user@example.com',
        },
      },
      refresh: vi.fn(),
      setActiveOrganization,
    }

    render(<InvitationPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Accept invite' }))

    await waitFor(() => {
      expect(setActiveOrganization).toHaveBeenCalledWith({ organizationId: 'org_1' })
    })
  })

  it('shows a mismatch warning when signed in as a different email', () => {
    authState = {
      session: {
        user: {
          email: 'other@example.com',
        },
      },
      refresh: vi.fn(),
      setActiveOrganization,
    }

    render(<InvitationPage />)

    expect(screen.getByText('Use the invited email')).toBeInTheDocument()
    expect(screen.getByText(/this invite is for user@example.com/i)).toBeInTheDocument()
  })

  it('shows an expired invitation message', () => {
    invitationState = {
      data: {
        ...validInvite,
        valid: false,
        expired: true,
      },
      isLoading: false,
      isError: false,
    }

    render(<InvitationPage />)

    expect(screen.getByText('Invitation unavailable')).toBeInTheDocument()
    expect(screen.getByText(/this invitation expired/i)).toBeInTheDocument()
  })

  it('shows a specific message for already declined invitations', () => {
    invitationState = {
      data: {
        ...validInvite,
        valid: false,
        alreadyUsed: true,
        status: 'rejected',
      },
      isLoading: false,
      isError: false,
    }

    render(<InvitationPage />)

    expect(screen.getByText('Invitation unavailable')).toBeInTheDocument()
    expect(screen.getByText(/already been declined/i)).toBeInTheDocument()
  })
})
