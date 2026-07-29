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
const passkeySignIn = vi.fn()
let mockCapabilities = {
  captcha: {
    enabled: false,
    provider: 'cloudflare-turnstile' as const,
    siteKey: null,
  },
  passkey: {
    enabled: false,
  },
  admin: {
    enabled: false,
  },
  jwt: {
    enabled: false,
  },
}
let mockCookie = ''

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

vi.mock('@/lib/hooks/use-auth-capabilities', () => ({
  useAuthCapabilities: () => ({
    capabilities: mockCapabilities,
    isLoading: false,
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

vi.mock('@/lib/auth/better-auth-client', () => ({
  betterAuthClient: {
    signIn: {
      passkey: (...args: unknown[]) => passkeySignIn(...args),
    },
  },
}))

describe('LoginForm', () => {
  beforeEach(() => {
    mockCookie = ''
    vi.spyOn(document, 'cookie', 'get').mockImplementation(() => mockCookie)
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
    passkeySignIn.mockReset()
    mockCapabilities = {
      captcha: {
        enabled: false,
        provider: 'cloudflare-turnstile',
        siteKey: null,
      },
      passkey: {
        enabled: false,
      },
      admin: {
        enabled: false,
      },
      jwt: {
        enabled: false,
      },
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('shows a hint when email was the last used login method', () => {
    mockCookie = 'better-auth.last_used_login_method=email'

    render(<LoginForm nextPath={null} />)

    expect(screen.getByTestId('last-login-method-email')).toHaveTextContent('Email was last used')
  })

  it('shows passkey sign-in only when the capability is enabled', async () => {
    const user = userEvent.setup()
    mockCapabilities = {
      ...mockCapabilities,
      passkey: {
        enabled: true,
      },
    }
    passkeySignIn.mockResolvedValue({ data: { session: {}, user: {} }, error: null })
    authRefresh.mockResolvedValue(undefined)

    render(<LoginForm nextPath={null} />)

    await user.click(screen.getByRole('button', { name: 'Sign in with passkey' }))

    await waitFor(() => {
      expect(passkeySignIn).toHaveBeenCalledOnce()
    })
    expect(routerReplace).toHaveBeenCalled()
  })

  it('refuses to submit without an email address', async () => {
    const user = userEvent.setup()
    render(<LoginForm nextPath={null} />)

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Please enter your email address.')).toBeVisible()
    expect(signInWithEmail).not.toHaveBeenCalled()
  })

  it('reports a wrong password on both fields without saying which was wrong', async () => {
    const user = userEvent.setup()
    signInWithEmail.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { code: 'AUTH_INVALID_CREDENTIALS' } },
    })

    render(<LoginForm nextPath={null} />)
    await user.type(screen.getByLabelText(/email/i), 'ada@acme.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    // Telling a caller which half was wrong confirms whether an account exists.
    await waitFor(() => {
      expect(screen.getAllByText('The email or password you entered is incorrect.').length).toBe(2)
    })
  })

  it('normalises the email before sending it', async () => {
    const user = userEvent.setup()
    signInWithEmail.mockResolvedValue({ twoFactorRedirect: false })
    authRefresh.mockResolvedValue(undefined)

    render(<LoginForm nextPath={null} />)
    await user.type(screen.getByLabelText(/email/i), '  Ada@ACME.com  ')
    await user.type(screen.getByLabelText('Password'), 'correct horse')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(signInWithEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ada@acme.com' })
      )
    })
  })

  it('hides passkey sign-in when the capability is off', () => {
    mockCapabilities = { ...mockCapabilities, passkey: { enabled: false } }
    render(<LoginForm nextPath={null} />)

    expect(screen.queryByRole('button', { name: 'Sign in with passkey' })).toBeNull()
  })

  it('always offers SSO, which does not depend on a capability flag', () => {
    render(<LoginForm nextPath={null} />)
    expect(screen.getByRole('button', { name: /sign in with sso/i })).toBeVisible()
  })

  it('surfaces a rate limit with the wait it was given', async () => {
    const user = userEvent.setup()
    signInWithEmail.mockRejectedValue({
      isAxiosError: true,
      response: { status: 429, data: { code: 'RATE_LIMITED', retryAfter: 30 } },
    })

    render(<LoginForm nextPath={null} />)
    await user.type(screen.getByLabelText(/email/i), 'ada@acme.com')
    await user.type(screen.getByLabelText('Password'), 'correct horse')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText(/Too many sign-in attempts/)).toBeVisible()
    // Disabled while the wait runs, so a user cannot keep hammering it.
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
  })

  it('refuses to submit without a password', async () => {
    const user = userEvent.setup()
    render(<LoginForm nextPath={null} />)

    await user.type(screen.getByLabelText(/email/i), 'ada@acme.com')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(signInWithEmail).not.toHaveBeenCalled())
  })

  it('rejects an address that is not an email before calling the API', async () => {
    const user = userEvent.setup()
    render(<LoginForm nextPath={null} />)

    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'correct horse')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(signInWithEmail).not.toHaveBeenCalled())
  })

  it('sends the user to the requested page after signing in', async () => {
    const user = userEvent.setup()
    signInWithEmail.mockResolvedValue({ twoFactorRedirect: false })
    authRefresh.mockResolvedValue(undefined)

    render(<LoginForm nextPath="/projects" />)
    await user.type(screen.getByLabelText(/email/i), 'ada@acme.com')
    await user.type(screen.getByLabelText('Password'), 'correct horse')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/projects'))
  })

  it('reports an unexpected failure without leaving the form stuck', async () => {
    const user = userEvent.setup()
    signInWithEmail.mockRejectedValue(new Error('network down'))

    render(<LoginForm nextPath={null} />)
    await user.type(screen.getByLabelText(/email/i), 'ada@acme.com')
    await user.type(screen.getByLabelText('Password'), 'correct horse')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
    })
  })
})
