import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { LoginForm } from '../login-form'

const routerReplace = jest.fn()
const routerRefresh = jest.fn()
const authRefresh = jest.fn()
const toastSuccess = jest.fn()
const toastInfo = jest.fn()
const toastError = jest.fn()
const toastWarning = jest.fn()
const signInWithEmail = jest.fn()
const verifyTotp = jest.fn()
const verifyBackupCode = jest.fn()
const completeRecoveryMfaSetup = jest.fn()
const sendEmailVerificationOtp = jest.fn()
const verifyEmailOtp = jest.fn()

jest.mock('@/lib/env', () => ({
  env: {
    isDev: false,
    mockAuthEnabled: false,
  },
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: routerReplace,
    refresh: routerRefresh,
  }),
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    refresh: authRefresh,
  }),
}))

jest.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({
    toast: {
      success: toastSuccess,
      info: toastInfo,
      error: toastError,
      warning: toastWarning,
    },
  }),
}))

jest.mock('@/lib/api/auth', () => ({
  authApi: {
    signInWithEmail: (...args: unknown[]) => signInWithEmail(...args),
    verifyTotp: (...args: unknown[]) => verifyTotp(...args),
    verifyBackupCode: (...args: unknown[]) => verifyBackupCode(...args),
    completeRecoveryMfaSetup: (...args: unknown[]) => completeRecoveryMfaSetup(...args),
    sendEmailVerificationOtp: (...args: unknown[]) => sendEmailVerificationOtp(...args),
    verifyEmailOtp: (...args: unknown[]) => verifyEmailOtp(...args),
  },
}))

describe('LoginForm', () => {
  beforeEach(() => {
    routerReplace.mockReset()
    routerRefresh.mockReset()
    authRefresh.mockReset()
    toastSuccess.mockReset()
    toastInfo.mockReset()
    toastError.mockReset()
    toastWarning.mockReset()
    signInWithEmail.mockReset()
    verifyTotp.mockReset()
    verifyBackupCode.mockReset()
    completeRecoveryMfaSetup.mockReset()
    sendEmailVerificationOtp.mockReset()
    verifyEmailOtp.mockReset()
  })

  it('starts fresh MFA setup before finishing sign-in with a recovery code', async () => {
    const user = userEvent.setup()

    signInWithEmail.mockResolvedValue({ twoFactorRedirect: true })
    verifyBackupCode.mockResolvedValue(undefined)
    completeRecoveryMfaSetup.mockResolvedValue({
      totpURI: 'otpauth://totp/PentaVault:test?secret=ABC123&issuer=PentaVault',
      backupCodes: ['code-1', 'code-2'],
    })
    authRefresh.mockResolvedValue(undefined)

    render(<LoginForm nextPath={null} />)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'SecurePass1!')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await screen.findByRole('button', { name: 'Verify' })
    await user.click(screen.getByRole('button', { name: 'Use recovery code' }))

    const firstRecoveryInput = screen
      .getByLabelText('Recovery code')
      .parentElement?.querySelector('#login-recovery-code-0') as HTMLInputElement | null

    expect(firstRecoveryInput).not.toBeNull()
    if (!firstRecoveryInput) {
      throw new Error('Expected the first recovery-code input to be rendered.')
    }

    fireEvent.paste(firstRecoveryInput, {
      clipboardData: {
        getData: () => 'ABCDE12345',
      },
    })

    await user.click(screen.getByRole('button', { name: 'Verify' }))

    await waitFor(() => {
      expect(verifyBackupCode).toHaveBeenCalledWith({
        code: 'ABCDE-12345',
        trustDevice: true,
      })
    })
    await waitFor(() => {
      expect(completeRecoveryMfaSetup).toHaveBeenCalledWith({
        password: 'SecurePass1!',
      })
    })
    expect(screen.getByText('Backup codes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verify and sign in' })).toBeInTheDocument()
    expect(routerReplace).not.toHaveBeenCalled()
    expect(routerRefresh).not.toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith(
      'Recovery code accepted. Set up your new authenticator to finish.'
    )
  })
})
