'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { authApi } from '@/lib/api/auth'
import { normalizeNextPath } from '@/lib/auth/paths'
import {
  DASHBOARD_HOME_PATH,
  FORGOT_PASSWORD_PATH,
  REGISTER_PATH,
  SETTINGS_ACCOUNT_PATH,
} from '@/lib/constants'
import { env } from '@/lib/env'
import { useAuth } from '@/lib/hooks/use-auth'
import { useEmailCooldown } from '@/lib/hooks/use-email-cooldown'
import { useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils/cn'
import {
  getApiErrorPayload,
  getApiFieldErrors,
  getApiFriendlyMessageWithRef,
} from '@/lib/utils/errors'

type LoginFormProps = {
  nextPath: string | null
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refresh } = useAuth()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState<string[]>(Array.from({ length: 10 }, () => ''))
  const [mfaMode, setMfaMode] = useState<'totp' | 'recovery'>('totp')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')
  const [trustDevice, setTrustDevice] = useState(true)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [retryAfter, setRetryAfter] = useState<number | null>(null)
  const verificationCooldown = useEmailCooldown()
  const recoveryCodeInputsRef = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      toast.warning('Your session has expired. Please sign in again.')
    }
  }, [searchParams, toast])

  useEffect(() => {
    if (!retryAfter || retryAfter <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setRetryAfter((current) => {
        if (!current || current <= 1) {
          window.clearInterval(timer)
          return null
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [retryAfter])

  async function completeSignIn(): Promise<void> {
    try {
      await refresh()
    } catch (refreshError) {
      if (env.isDev) {
        console.error('[auth] sign-in succeeded but session refresh failed', refreshError)
      }
    }

    toast.success('Signed in successfully.')
    router.replace(normalizeNextPath(nextPath) ?? DASHBOARD_HOME_PATH)
    router.refresh()
  }

  async function submitCredentials(
    normalizedEmail: string,
    currentPassword: string
  ): Promise<void> {
    const signInResult = await authApi.signInWithEmail({
      email: normalizedEmail,
      password: currentPassword,
    })

    if (signInResult.twoFactorRedirect) {
      setMfaRequired(true)
      setEmailVerificationRequired(false)
      toast.info('Enter your authenticator code to finish signing in.')
      return
    }

    await completeSignIn()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})

    const normalizedEmail = email.trim().toLowerCase()
    const nextFieldErrors: Record<string, string> = {}

    if (!normalizedEmail) {
      nextFieldErrors.email = 'Please enter your email address.'
    }

    if (!password) {
      nextFieldErrors.password = 'Please enter your password.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    try {
      setIsPending(true)
      await submitCredentials(normalizedEmail, password)
    } catch (submitError) {
      const fields = getApiFieldErrors(submitError)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        return
      }

      const payload = getApiErrorPayload(submitError)
      if (payload?.code === 'AUTH_EMAIL_NOT_VERIFIED') {
        setVerificationEmail(normalizedEmail)
        setEmailVerificationRequired(true)
        setVerificationCode('')
        try {
          await authApi.sendEmailVerificationOtp({ email: normalizedEmail })
          verificationCooldown.startCooldown(60)
          toast.info('Verification code sent.')
        } catch (sendError) {
          const sendPayload = getApiErrorPayload(sendError)
          if (sendPayload?.code === 'RATE_LIMITED' && typeof sendPayload.retryAfter === 'number') {
            verificationCooldown.startCooldown(sendPayload.retryAfter)
            toast.warning(`Wait ${sendPayload.retryAfter}s before resending.`)
          } else {
            toast.info('Verify your email to continue.')
          }
        }
        return
      }

      if (payload?.code === 'AUTH_INVALID_CREDENTIALS') {
        setFieldErrors({
          email: 'The email or password you entered is incorrect.',
          password: 'The email or password you entered is incorrect.',
        })
      }

      if (payload?.code === 'RATE_LIMITED' && typeof payload.retryAfter === 'number') {
        setRetryAfter(payload.retryAfter)
      }

      const message =
        env.mockAuthEnabled && submitError instanceof Error
          ? submitError.message
          : getApiFriendlyMessageWithRef(
              submitError,
              'Cannot sign you in right now. Please try again.'
            )
      toast.error(message)
    } finally {
      setIsPending(false)
    }
  }

  async function handleEmailVerificationSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})

    const normalizedCode = verificationCode.trim()
    if (!normalizedCode) {
      setFieldErrors({ verificationCode: 'Enter the verification code from your email.' })
      return
    }

    try {
      setIsPending(true)
      await authApi.verifyEmailOtp({
        email: verificationEmail,
        otp: normalizedCode,
      })
      toast.success('Email verified.')
      await submitCredentials(verificationEmail, password)
    } catch (error) {
      const fields = getApiFieldErrors(error)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        return
      }

      const payload = getApiErrorPayload(error)
      if (payload?.code === 'AUTH_VERIFICATION_CODE_INVALID') {
        setFieldErrors({ verificationCode: 'The verification code is invalid.' })
      }

      toast.error(
        getApiFriendlyMessageWithRef(
          error,
          'Unable to verify this code. Request a new code and try again.'
        )
      )
    } finally {
      setIsPending(false)
    }
  }

  async function handleResendVerification(): Promise<void> {
    if (!verificationEmail) {
      return
    }

    try {
      setIsResendingVerification(true)
      await authApi.sendEmailVerificationOtp({ email: verificationEmail })
      verificationCooldown.startCooldown(60)
      toast.success('Code sent.')
    } catch (error) {
      const payload = getApiErrorPayload(error)
      if (payload?.code === 'RATE_LIMITED' && typeof payload.retryAfter === 'number') {
        verificationCooldown.startCooldown(payload.retryAfter)
      }
      toast.error(getApiFriendlyMessageWithRef(error, 'Unable to send a verification code.'))
    } finally {
      setIsResendingVerification(false)
    }
  }

  async function handleMfaSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})

    const normalizedRecoveryCode = recoveryCode.join('')
    const normalizedCode =
      mfaMode === 'totp'
        ? mfaCode.trim()
        : `${normalizedRecoveryCode.slice(0, 5)}-${normalizedRecoveryCode.slice(5)}`
    if (mfaMode === 'totp' && normalizedCode.length !== 6) {
      setFieldErrors({ mfaCode: 'Enter the 6-digit code.' })
      return
    }

    if (mfaMode === 'recovery' && normalizedRecoveryCode.length !== 10) {
      setFieldErrors({ recoveryCode: 'Enter all 10 characters from one recovery code.' })
      return
    }

    try {
      setIsPending(true)
      if (mfaMode === 'totp') {
        await authApi.verifyTotp({
          code: normalizedCode,
          trustDevice,
        })
      } else {
        await authApi.verifyBackupCode({
          code: normalizedCode,
          trustDevice,
        })
      }

      try {
        await refresh()
      } catch (refreshError) {
        if (env.isDev) {
          console.error('[auth] MFA succeeded but session refresh failed', refreshError)
        }
      }

      if (mfaMode === 'recovery') {
        toast.success('Recovery code accepted. Review MFA now.')
        router.replace(`${SETTINGS_ACCOUNT_PATH}?mfaRecoveryUsed=1`)
        router.refresh()
        return
      }

      toast.success('Signed in successfully.')
      router.replace(normalizeNextPath(nextPath) ?? DASHBOARD_HOME_PATH)
      router.refresh()
    } catch (submitError) {
      const payload = getApiErrorPayload(submitError)
      if (payload?.code === 'AUTH_MFA_CODE_INVALID') {
        setFieldErrors(
          mfaMode === 'totp'
            ? { mfaCode: 'The authentication code is invalid.' }
            : { recoveryCode: 'The recovery code is invalid.' }
        )
      }

      toast.error(
        getApiFriendlyMessageWithRef(
          submitError,
          'Cannot verify this authentication code right now.'
        )
      )
    } finally {
      setIsPending(false)
    }
  }

  function updateRecoveryCodeAt(index: number, value: string) {
    const character = value.replace(/[^A-Za-z0-9]/g, '').slice(-1)
    const nextValue = [...recoveryCode]
    nextValue[index] = character
    setRecoveryCode(nextValue)
    setFieldErrors((current) => ({ ...current, recoveryCode: '' }))

    if (character && index < 9) {
      recoveryCodeInputsRef.current[index + 1]?.focus()
    }
  }

  function handleRecoveryCodeKeyDown(index: number, key: string) {
    if (key === 'Backspace' && !recoveryCode[index] && index > 0) {
      recoveryCodeInputsRef.current[index - 1]?.focus()
    }
  }

  function handleRecoveryCodePaste(value: string) {
    const normalized = value.replace(/[^A-Za-z0-9]/g, '').slice(0, 10)
    setRecoveryCode(Array.from({ length: 10 }, (_, index) => normalized[index] ?? ''))
    setFieldErrors((current) => ({ ...current, recoveryCode: '' }))
    recoveryCodeInputsRef.current[Math.min(normalized.length, 9)]?.focus()
  }

  if (emailVerificationRequired) {
    return (
      <form className="space-y-4" onSubmit={(event) => void handleEmailVerificationSubmit(event)}>
        <div className="rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-muted-foreground">
          Code sent to <span className="font-medium text-foreground">{verificationEmail}</span>.
        </div>

        <div className="space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor="login-email-verification-code"
          >
            Verification code
          </label>
          <Input
            autoComplete="one-time-code"
            className={cn(
              'h-11 text-center font-mono text-base tracking-[0.4em]',
              fieldErrors.verificationCode && 'border-danger focus-visible:ring-danger'
            )}
            id="login-email-verification-code"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => {
              setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))
              setFieldErrors((current) => ({ ...current, verificationCode: '' }))
            }}
            placeholder="000000"
            value={verificationCode}
          />
          {fieldErrors.verificationCode ? (
            <p className="text-sm text-danger">{fieldErrors.verificationCode}</p>
          ) : null}
        </div>

        <div className="space-y-3">
          <Button className="w-full" disabled={isPending} type="submit">
            {isPending ? 'Verifying...' : 'Verify'}
          </Button>

          <Button
            className="w-full"
            disabled={isResendingVerification || verificationCooldown.isOnCooldown}
            onClick={() => void handleResendVerification()}
            type="button"
            variant="outline"
          >
            {verificationCooldown.isOnCooldown
              ? `Wait ${verificationCooldown.secondsLeft}s`
              : isResendingVerification
                ? 'Sending...'
                : 'Resend'}
          </Button>

          <button
            className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            onClick={() => {
              setEmailVerificationRequired(false)
              setVerificationCode('')
              setPassword('')
              setFieldErrors({})
            }}
            type="button"
          >
            Back
          </button>
        </div>
      </form>
    )
  }

  if (mfaRequired) {
    return (
      <form className="space-y-4" onSubmit={(event) => void handleMfaSubmit(event)}>
        <div className="rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-muted-foreground">
          {mfaMode === 'totp' ? 'Enter your authenticator code.' : 'Enter a recovery code.'}
        </div>

        {mfaMode === 'totp' ? (
          <div className="space-y-1">
            <label
              className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor="login-mfa-code"
            >
              Authenticator code
            </label>
            <Input
              autoComplete="one-time-code"
              className={cn(
                'h-11 text-center font-mono text-base tracking-[0.4em]',
                fieldErrors.mfaCode && 'border-danger focus-visible:ring-danger'
              )}
              id="login-mfa-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => {
                setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                setFieldErrors((current) => ({ ...current, mfaCode: '' }))
              }}
              placeholder="000000"
              value={mfaCode}
            />
            {fieldErrors.mfaCode ? (
              <p className="text-sm text-danger">{fieldErrors.mfaCode}</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-1">
            <label
              className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor="login-recovery-code-0"
            >
              Recovery code
            </label>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }, (_, index) => (
                <Input
                  key={index}
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  className={cn(
                    'h-11 px-0 text-center font-mono text-sm',
                    fieldErrors.recoveryCode && 'border-danger focus-visible:ring-danger'
                  )}
                  id={`login-recovery-code-${index}`}
                  inputMode="text"
                  maxLength={1}
                  onChange={(event) => updateRecoveryCodeAt(index, event.target.value)}
                  onKeyDown={(event) => handleRecoveryCodeKeyDown(index, event.key)}
                  onPaste={(event) => {
                    event.preventDefault()
                    handleRecoveryCodePaste(event.clipboardData.getData('text'))
                  }}
                  ref={(element) => {
                    recoveryCodeInputsRef.current[index] = element
                  }}
                  value={recoveryCode[index] ?? ''}
                />
              ))}
            </div>
            {fieldErrors.recoveryCode ? (
              <p className="text-sm text-danger">{fieldErrors.recoveryCode}</p>
            ) : null}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            checked={trustDevice}
            className="h-4 w-4 accent-[#00c573]"
            onChange={(event) => setTrustDevice(event.target.checked)}
            type="checkbox"
          />
          Trust this device for 30 days
        </label>

        <div className="space-y-3">
          <Button className="w-full" disabled={isPending} type="submit">
            {isPending ? 'Verifying...' : 'Verify'}
          </Button>

          <button
            className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            onClick={() => {
              setMfaMode((current) => (current === 'totp' ? 'recovery' : 'totp'))
              setMfaCode('')
              setRecoveryCode(Array.from({ length: 10 }, () => ''))
              setFieldErrors({})
            }}
            type="button"
          >
            {mfaMode === 'totp' ? 'Use recovery code' : 'Use authenticator code'}
          </button>

          <button
            className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            onClick={() => {
              setMfaRequired(false)
              setMfaCode('')
              setRecoveryCode(Array.from({ length: 10 }, () => ''))
              setMfaMode('totp')
              setPassword('')
              setFieldErrors({})
            }}
            type="button"
          >
            Back
          </button>
        </div>
      </form>
    )
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="login-email"
        >
          Email
        </label>
        <Input
          autoComplete="email"
          className={cn(fieldErrors.email && 'border-danger focus-visible:ring-danger')}
          id="login-email"
          onChange={(event) => {
            setEmail(event.target.value)
            setFieldErrors((current) => ({ ...current, email: '' }))
          }}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
        {fieldErrors.email ? <p className="text-sm text-danger">{fieldErrors.email}</p> : null}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor="login-password"
          >
            Password
          </label>
          <Link
            className="text-xs text-[#00c573] underline decoration-[#00c573]/55 underline-offset-4 transition-[color,text-decoration-color] duration-200 ease-out hover:text-[#3ecf8e] hover:decoration-[#3ecf8e]"
            href={FORGOT_PASSWORD_PATH}
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          autoComplete="current-password"
          className={cn(fieldErrors.password && 'border-danger focus-visible:ring-danger')}
          id="login-password"
          onChange={(event) => {
            setPassword(event.target.value)
            setFieldErrors((current) => ({ ...current, password: '' }))
          }}
          placeholder="Enter your password"
          value={password}
        />
        {fieldErrors.password ? (
          <p className="text-sm text-danger">{fieldErrors.password}</p>
        ) : null}
      </div>

      {retryAfter ? (
        <p className="text-sm text-danger">
          Too many sign-in attempts. Please try again in {retryAfter} second
          {retryAfter === 1 ? '' : 's'}.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <Button className="w-full" disabled={isPending || Boolean(retryAfter)} type="submit">
          {isPending ? 'Signing in...' : 'Sign in'}
        </Button>

        <Link
          className="text-sm whitespace-normal text-[#00c573] underline decoration-[#00c573]/55 underline-offset-4 transition-[color,text-decoration-color] duration-200 ease-out hover:text-[#3ecf8e] hover:decoration-[#3ecf8e]"
          href={REGISTER_PATH}
        >
          Need an account? Create one
        </Link>
      </div>

      {env.mockAuthEnabled ? (
        <p className="text-xs text-muted-foreground">
          Mock login enabled: use `{env.mockAuthEmail}` and `{env.mockAuthPassword}`.
        </p>
      ) : null}
    </form>
  )
}
