import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { MfaSettingsCard } from '../mfa-settings-card'

const toastSuccess = vi.fn()
const toastError = vi.fn()
const disableMfa = vi.fn()
const startMfaChange = vi.fn()
const enableMfa = vi.fn()
const verifyTotp = vi.fn()
const completeMfaSetup = vi.fn()

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
    disableMfa: (...args: unknown[]) => disableMfa(...args),
    startMfaChange: (...args: unknown[]) => startMfaChange(...args),
    enableMfa: (...args: unknown[]) => enableMfa(...args),
    verifyTotp: (...args: unknown[]) => verifyTotp(...args),
    completeMfaSetup: (...args: unknown[]) => completeMfaSetup(...args),
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
    completeMfaSetup.mockReset()
  })

  it('disables MFA with password and authenticator code', async () => {
    const user = userEvent.setup()
    const onChanged = vi.fn().mockResolvedValue(undefined)

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
        onChanged={vi.fn().mockResolvedValue(undefined)}
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
    await user.paste('AbCdE12345')
    await user.click(screen.getByRole('button', { name: 'Change MFA' }))

    await waitFor(() => {
      expect(startMfaChange).toHaveBeenCalledWith({
        password: 'SecurePass1!',
        verificationMethod: 'recovery',
        code: 'AbCdE-12345',
      })
    })
  })
})
