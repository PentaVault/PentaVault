import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import DeviceApprovalPage from '../page'

const approveDevice = vi.fn()
const toastSuccess = vi.fn()
const toastError = vi.fn()

let mockAuthState: {
  activeOrganization: unknown
  session: unknown
  status: 'authenticated' | 'loading' | 'unauthenticated'
}

vi.mock('@/lib/api/auth', () => ({
  authApi: {
    approveDevice: (...args: unknown[]) => approveDevice(...args),
  },
}))

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => mockAuthState,
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({
    toast: {
      success: toastSuccess,
      error: toastError,
    },
  }),
}))

describe('DeviceApprovalPage', () => {
  beforeEach(() => {
    approveDevice.mockReset()
    toastSuccess.mockReset()
    toastError.mockReset()
    mockAuthState = {
      activeOrganization: null,
      session: null,
      status: 'unauthenticated',
    }
  })

  it('asks unauthenticated users to sign in or create an account before approving a CLI device', () => {
    render(<DeviceApprovalPage />)

    expect(screen.getByRole('heading', { name: 'Sign in to continue' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login?next=%2Fdevice'
    )
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute(
      'href',
      '/register?next=%2Fdevice'
    )
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
  })

  it('shows the current account before asking for the approval code', async () => {
    const user = userEvent.setup()
    mockAuthState = {
      status: 'authenticated',
      session: {
        user: {
          id: 'user_123',
          name: 'Abhash Chakraborty',
          username: 'abhash',
          email: 'abhash@example.com',
        },
      },
      activeOrganization: {
        organization: {
          name: 'PentaVault',
        },
        membership: {
          role: 'developer',
        },
      },
    }

    render(<DeviceApprovalPage />)

    expect(screen.getByText('Abhash Chakraborty')).toBeInTheDocument()
    expect(screen.getByText('abhash@example.com')).toBeInTheDocument()
    expect(screen.getByText('PentaVault - developer')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /decline/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByRole('heading', { name: 'Approve CLI sign in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toHaveClass('w-full')
  })

  it('normalizes pasted device codes before approving', async () => {
    const user = userEvent.setup()
    approveDevice.mockResolvedValue(undefined)
    mockAuthState = {
      status: 'authenticated',
      session: {
        user: {
          id: 'user_123',
          name: 'Abhash Chakraborty',
          username: 'abhash',
          email: 'abhash@example.com',
        },
      },
      activeOrganization: null,
    }

    render(<DeviceApprovalPage />)

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByLabelText('User code'))
    await user.paste('xev-mf3')
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() => {
      expect(approveDevice).toHaveBeenCalledWith('XEVMF3')
    })
    expect(toastSuccess).toHaveBeenCalledWith('Device approved successfully.')
  })
})
