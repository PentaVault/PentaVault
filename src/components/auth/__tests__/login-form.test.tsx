import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { LoginForm } from '../login-form'

const routerReplace = vi.fn()
const routerRefresh = vi.fn()
const authRefresh = vi.fn()
const toastSuccess = vi.fn()
const toastInfo = vi.fn()
const toastError = vi.fn()
const toastWarning = vi.fn()
const signInWithEmail = vi.fn()
const verifyTotp = vi.fn()
const verifyBackupCode = vi.fn()
const startRecoveryMfaSetup = vi.fn()
const completeMfaSetup = vi.fn()
const sendEmailVerificationOtp = vi.fn()
const verifyEmailOtp = vi.fn()

vi.mock('@/lib/env', () => ({
  env: {
    isDev: false,
    mockAuthEnabled: false,
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: routerReplace,
    refresh: routerRefresh,
  }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    refresh: authRefresh,
  }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({
    toast: {
      success: toastSuccess,
      info: toastInfo,
      error: toastError,
      warning: toastWarning,
    },
  }),
}))

vi.mock('@/lib/api/auth', () => ({
  authApi: {
    signInWithEmail: (...args: unknown[]) => signInWithEmail(...args),
    verifyTotp: (...args: unknown[]) => verifyTotp(...args),
    verifyBackupCode: (...args: unknown[]) => verifyBackupCode(...args),
    startRecoveryMfaSetup: (...args: unknown[]) => startRecoveryMfaSetup(...args),
    completeMfaSetup: (...args: unknown[]) => completeMfaSetup(...args),
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
    startRecoveryMfaSetup.mockReset()
    completeMfaSetup.mockReset()
    sendEmailVerificationOtp.mockReset()
    verifyEmailOtp.mockReset()
  })

  it('starts fresh MFA setup before finishing sign-in with a recovery code', async () => {
    const user = userEvent.setup()

    signInWithEmail.mockResolvedValue({ twoFactorRedirect: true })
    startRecoveryMfaSetup.mockResolvedValue({
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
      expect(startRecoveryMfaSetup).toHaveBeenCalledWith({
        password: 'SecurePass1!',
        code: 'ABCDE-12345',
      })
    })
    expect(verifyBackupCode).not.toHaveBeenCalled()
    expect(screen.getByText('Backup codes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verify and sign in' })).toBeInTheDocument()
    expect(routerReplace).not.toHaveBeenCalled()
    expect(routerRefresh).not.toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith(
      'Recovery code accepted. Set up your new authenticator to finish.'
    )
  })
})
