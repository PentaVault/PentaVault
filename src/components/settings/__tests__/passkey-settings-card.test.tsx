import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PasskeySettingsCard } from '../passkey-settings-card'

const toastSuccess = vi.fn()
const toastError = vi.fn()
const listPasskeys = vi.fn()
const updatePasskey = vi.fn()
const deletePasskey = vi.fn()
const addPasskey = vi.fn()

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    session: {
      user: {
        email: 'owner@example.com',
        name: 'Owner Example',
      },
    },
  }),
}))

vi.mock('@/lib/hooks/use-auth-capabilities', () => ({
  useAuthCapabilities: () => ({
    capabilities: {
      captcha: {
        enabled: false,
        provider: 'cloudflare-turnstile',
        siteKey: null,
      },
      passkey: {
        enabled: true,
      },
      admin: {
        enabled: false,
      },
      jwt: {
        enabled: false,
      },
    },
    isLoading: false,
  }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({
    toast: {
      success: toastSuccess,
      error: toastError,
    },
  }),
}))

vi.mock('@/lib/api/auth', () => ({
  authApi: {
    listPasskeys: (...args: unknown[]) => listPasskeys(...args),
    updatePasskey: (...args: unknown[]) => updatePasskey(...args),
    deletePasskey: (...args: unknown[]) => deletePasskey(...args),
  },
}))

vi.mock('@/lib/auth/better-auth-client', () => ({
  betterAuthClient: {
    passkey: {
      addPasskey: (...args: unknown[]) => addPasskey(...args),
    },
  },
}))

describe('PasskeySettingsCard', () => {
  beforeEach(() => {
    toastSuccess.mockReset()
    toastError.mockReset()
    listPasskeys.mockReset()
    updatePasskey.mockReset()
    deletePasskey.mockReset()
    addPasskey.mockReset()
    listPasskeys.mockResolvedValue([
      {
        id: 'passkey_1',
        name: 'Old laptop',
        deviceType: 'singleDevice',
        backedUp: false,
      },
    ])
    updatePasskey.mockResolvedValue(undefined)
    deletePasskey.mockResolvedValue(undefined)
    addPasskey.mockResolvedValue({ data: { id: 'passkey_2' }, error: null })
  })

  it('uses an account-specific default name when adding a passkey', async () => {
    const user = userEvent.setup()

    render(<PasskeySettingsCard />)

    await user.click(screen.getByRole('button', { name: 'Add passkey' }))

    await waitFor(() => {
      expect(addPasskey).toHaveBeenCalledWith({
        name: 'PentaVault - owner@example.com',
      })
    })
  })

  it('renames a passkey after validating the new name', async () => {
    const user = userEvent.setup()

    render(<PasskeySettingsCard />)

    await screen.findByText('Old laptop')
    await user.click(screen.getByRole('button', { name: 'Rename Old laptop' }))
    const input = screen.getByLabelText('Passkey name')
    await user.clear(input)
    await user.click(screen.getByRole('button', { name: 'Save passkey name' }))

    expect(screen.getByText('Enter a passkey name.')).toBeInTheDocument()
    expect(updatePasskey).not.toHaveBeenCalled()

    await user.type(input, 'Work laptop Chrome')
    await user.click(screen.getByRole('button', { name: 'Save passkey name' }))

    await waitFor(() => {
      expect(updatePasskey).toHaveBeenCalledWith({
        id: 'passkey_1',
        name: 'Work laptop Chrome',
      })
    })
  })

  it('confirms passkey removal before deleting', async () => {
    const user = userEvent.setup()

    render(<PasskeySettingsCard />)

    await screen.findByText('Old laptop')
    await user.click(screen.getByRole('button', { name: 'Remove Old laptop' }))
    expect(screen.getByText('Remove this passkey?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove passkey' }))

    await waitFor(() => {
      expect(deletePasskey).toHaveBeenCalledWith('passkey_1')
    })
  })
})
