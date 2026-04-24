import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { MfaSettingsCard } from '../mfa-settings-card'

const toastSuccess = jest.fn()
const toastError = jest.fn()
const disableMfa = jest.fn()
const startMfaChange = jest.fn()
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
    disableMfa: (...args: unknown[]) => disableMfa(...args),
    startMfaChange: (...args: unknown[]) => startMfaChange(...args),
    enableMfa: (...args: unknown[]) => enableMfa(...args),
    verifyTotp: (...args: unknown[]) => verifyTotp(...args),
  },
}))

describe('MfaSettingsCard', () => {
  beforeEach(() => {
    toastSuccess.mockReset()
    toastError.mockReset()
    disableMfa.mockReset()
    startMfaChange.mockReset()
    enableMfa.mockReset()
    verifyTotp.mockReset()
  })

  it('disables MFA with password and authenticator code', async () => {
    const user = userEvent.setup()
    const onChanged = jest.fn().mockResolvedValue(undefined)

    disableMfa.mockResolvedValue(undefined)

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

    await user.click(screen.getByRole('button', { name: 'Disable MFA' }))
    await user.type(screen.getByLabelText('Current password'), 'SecurePass1!')
    await user.type(screen.getByLabelText('Authenticator code'), '123456')
    await user.click(screen.getByRole('button', { name: 'Disable MFA' }))

    await waitFor(() => {
      expect(disableMfa).toHaveBeenCalledWith({
        password: 'SecurePass1!',
        code: '123456',
      })
    })
    await waitFor(() => {
      expect(onChanged).toHaveBeenCalled()
    })
  })

  it('starts MFA change with a recovery code', async () => {
    const user = userEvent.setup()

    startMfaChange.mockResolvedValue({
      totpURI: 'otpauth://totp/PentaVault:test?secret=ABC123&issuer=PentaVault',
      backupCodes: ['one', 'two'],
    })

    render(
      <MfaSettingsCard
        onChanged={jest.fn().mockResolvedValue(undefined)}
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

    await user.click(screen.getByRole('button', { name: 'Change MFA' }))
    await user.click(screen.getByRole('button', { name: 'Use recovery code' }))
    await user.type(screen.getByLabelText('Current password'), 'SecurePass1!')

    const firstRecoveryInput = document.querySelector('#mfa-change-recovery-0') as HTMLInputElement
    await user.click(firstRecoveryInput)
    await user.paste('ABCDE12345')
    await user.click(screen.getByRole('button', { name: 'Change MFA' }))

    await waitFor(() => {
      expect(startMfaChange).toHaveBeenCalledWith({
        password: 'SecurePass1!',
        verificationMethod: 'recovery',
        code: 'ABCDE-12345',
      })
    })
  })
})
