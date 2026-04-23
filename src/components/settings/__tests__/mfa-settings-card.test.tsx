import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { MfaSettingsCard } from '../mfa-settings-card'

const toastSuccess = jest.fn()
const toastError = jest.fn()
const startDisableMfa = jest.fn()
const resendDisableMfaCode = jest.fn()
const confirmDisableMfa = jest.fn()
const enableMfa = jest.fn()
const verifyTotp = jest.fn()

jest.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({
    toast: {
      success: toastSuccess,
      error: toastError,
    },
  }),
}))

jest.mock('@/lib/api/auth', () => ({
  authApi: {
    startDisableMfa: (...args: unknown[]) => startDisableMfa(...args),
    resendDisableMfaCode: (...args: unknown[]) => resendDisableMfaCode(...args),
    confirmDisableMfa: (...args: unknown[]) => confirmDisableMfa(...args),
    enableMfa: (...args: unknown[]) => enableMfa(...args),
    verifyTotp: (...args: unknown[]) => verifyTotp(...args),
  },
}))

describe('MfaSettingsCard', () => {
  beforeEach(() => {
    toastSuccess.mockReset()
    toastError.mockReset()
    startDisableMfa.mockReset()
    resendDisableMfaCode.mockReset()
    confirmDisableMfa.mockReset()
    enableMfa.mockReset()
    verifyTotp.mockReset()
  })

  it('uses the email challenge flow to disable MFA', async () => {
    const user = userEvent.setup()
    const onChanged = jest.fn().mockResolvedValue(undefined)

    startDisableMfa.mockResolvedValue({ email: 'user@example.com' })
    confirmDisableMfa.mockResolvedValue(undefined)

    render(
      <MfaSettingsCard
        onChanged={onChanged}
        user={{
          id: 'user_1',
          email: 'user@example.com',
          name: 'User Example',
          image: null,
          emailVerified: true,
          twoFactorEnabled: true,
          defaultOrganizationId: 'org_1',
        }}
      />
    )

    await user.type(screen.getByLabelText('Current password'), 'SecurePass1!')
    await user.click(screen.getByRole('button', { name: 'Send code' }))

    await waitFor(() => {
      expect(startDisableMfa).toHaveBeenCalledWith({ password: 'SecurePass1!' })
    })

    expect(screen.getByText('Code sent to user@example.com.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password confirmed')).toBeDisabled()

    await user.type(screen.getByLabelText('Email code'), '123456')
    await user.click(screen.getByRole('button', { name: 'Disable MFA' }))

    await waitFor(() => {
      expect(confirmDisableMfa).toHaveBeenCalledWith({ code: '123456' })
    })

    await waitFor(() => {
      expect(onChanged).toHaveBeenCalled()
    })
    expect(toastSuccess).toHaveBeenCalledWith('Multi-factor authentication has been disabled.')
  })
})
