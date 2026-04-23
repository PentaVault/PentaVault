'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { PasswordRequirements } from '@/components/auth/password-requirements'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { authApi } from '@/lib/api/auth'
import { isPasswordPolicySatisfied } from '@/lib/auth/password-policy'
import { DASHBOARD_HOME_PATH, LOGIN_PATH } from '@/lib/constants'
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

export function RegisterForm() {
  const router = useRouter()
  const auth = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')
  const [isVerificationStep, setIsVerificationStep] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false)
  const emailCooldown = useEmailCooldown()

  useEffect(() => {
    if (auth.status === 'authenticated') {
      router.replace(DASHBOARD_HOME_PATH)
    }
  }, [auth.status, router])

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})

    const normalizedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()
    const nextFieldErrors: Record<string, string> = {}

    if (!normalizedName) {
      nextFieldErrors.name = 'Please enter your full name.'
    }

    if (!normalizedEmail) {
      nextFieldErrors.email = 'Please enter your email address.'
    }

    if (!password) {
      nextFieldErrors.password = 'Please create a password.'
    } else if (!isPasswordPolicySatisfied(password)) {
      nextFieldErrors.password =
        'Use at least 8 characters with uppercase, lowercase, number, and special characters.'
    }

    if (!confirmPassword) {
      nextFieldErrors.confirmPassword = 'Please confirm your password.'
    } else if (password !== confirmPassword) {
      nextFieldErrors.confirmPassword = 'Passwords do not match yet.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    try {
      setIsPending(true)
      await authApi.startRegistration({
        name: normalizedName,
        email: normalizedEmail,
        password,
      })

      setVerificationEmail(normalizedEmail)
      setIsVerificationStep(true)
      emailCooldown.startCooldown(60)
      toast.success('Code sent. Check your email.')
    } catch (submitError) {
      const fields = getApiFieldErrors(submitError)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        return
      }

      const message =
        env.mockAuthEnabled && submitError instanceof Error
          ? submitError.message
          : getApiFriendlyMessageWithRef(
              submitError,
              'Unable to create your account right now. Please try again.'
            )
      toast.error(message)
    } finally {
      setIsPending(false)
    }
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})

    const normalizedCode = verificationCode.trim()
    if (!normalizedCode) {
      setFieldErrors({ otp: 'Enter the verification code from your email.' })
      return
    }

    try {
      setIsPending(true)
      await authApi.completeRegistration({
        email: verificationEmail,
        otp: normalizedCode,
      })

      toast.success('Email verified. Sign in to continue.')
      router.replace(LOGIN_PATH)
      router.refresh()
    } catch (verifyError) {
      const fields = getApiFieldErrors(verifyError)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        return
      }

      toast.error(
        getApiFriendlyMessageWithRef(
          verifyError,
          'Unable to verify this code. Request a new code and try again.'
        )
      )
    } finally {
      setIsPending(false)
    }
  }

  async function handleResend(): Promise<void> {
    if (!verificationEmail) {
      return
    }

    try {
      setIsResending(true)
      await authApi.resendRegistrationCode({ email: verificationEmail })
      emailCooldown.startCooldown(60)
      toast.success('Code sent.')
    } catch (resendError) {
      const payload = getApiErrorPayload(resendError)
      if (payload?.code === 'RATE_LIMITED' && typeof payload.retryAfter === 'number') {
        emailCooldown.startCooldown(payload.retryAfter)
      }

      toast.error(
        getApiFriendlyMessageWithRef(resendError, 'Unable to send a verification code right now.')
      )
    } finally {
      setIsResending(false)
    }
  }

  if (isVerificationStep) {
    return (
      <form className="space-y-4" onSubmit={(event) => void handleVerifySubmit(event)}>
        <div className="rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-muted-foreground">
          Code sent to <span className="font-medium text-foreground">{verificationEmail}</span>.
        </div>

        <div className="space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor="register-otp"
          >
            Verification code
          </label>
          <Input
            autoComplete="one-time-code"
            className={cn(
              'h-11 text-center font-mono text-base tracking-[0.4em]',
              fieldErrors.otp && 'border-danger focus-visible:ring-danger'
            )}
            id="register-otp"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => {
              setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))
              setFieldErrors((current) => ({ ...current, otp: '' }))
            }}
            placeholder="000000"
            value={verificationCode}
          />
          {fieldErrors.otp ? <p className="text-sm text-danger">{fieldErrors.otp}</p> : null}
        </div>

        <div className="space-y-3">
          <Button className="w-full" disabled={isPending} type="submit">
            {isPending ? 'Verifying...' : 'Verify'}
          </Button>

          <Button
            className="w-full"
            disabled={isResending || emailCooldown.isOnCooldown}
            onClick={() => void handleResend()}
            type="button"
            variant="outline"
          >
            {emailCooldown.isOnCooldown
              ? `Wait ${emailCooldown.secondsLeft}s`
              : isResending
                ? 'Sending...'
                : 'Resend'}
          </Button>

          <button
            className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            onClick={() => {
              setIsVerificationStep(false)
              setVerificationCode('')
              setFieldErrors({})
            }}
            type="button"
          >
            Use a different email
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
          htmlFor="register-name"
        >
          Full name
        </label>
        <Input
          autoComplete="name"
          className={cn(fieldErrors.name && 'border-danger focus-visible:ring-danger')}
          id="register-name"
          onChange={(event) => {
            setName(event.target.value)
            setFieldErrors((current) => ({ ...current, name: '' }))
          }}
          placeholder="Alex Rivera"
          value={name}
        />
        {fieldErrors.name ? <p className="text-sm text-danger">{fieldErrors.name}</p> : null}
      </div>

      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="register-email"
        >
          Email
        </label>
        <Input
          autoComplete="email"
          className={cn(fieldErrors.email && 'border-danger focus-visible:ring-danger')}
          id="register-email"
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
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="register-password"
        >
          Password
        </label>
        <PasswordInput
          autoComplete="new-password"
          className={cn(fieldErrors.password && 'border-danger focus-visible:ring-danger')}
          id="register-password"
          onBlur={() => setIsPasswordFocused(false)}
          onChange={(event) => {
            setPassword(event.target.value)
            setFieldErrors((current) => ({ ...current, password: '' }))
          }}
          onFocus={() => setIsPasswordFocused(true)}
          placeholder="Create a strong password"
          value={password}
        />
        <PasswordRequirements
          password={password}
          visible={isPasswordFocused || isConfirmPasswordFocused || password.length > 0}
        />
        {fieldErrors.password ? (
          <p className="text-sm text-danger">{fieldErrors.password}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="register-password-confirm"
        >
          Confirm password
        </label>
        <PasswordInput
          autoComplete="new-password"
          className={cn(fieldErrors.confirmPassword && 'border-danger focus-visible:ring-danger')}
          id="register-password-confirm"
          onBlur={() => setIsConfirmPasswordFocused(false)}
          onChange={(event) => {
            setConfirmPassword(event.target.value)
            setFieldErrors((current) => ({ ...current, confirmPassword: '' }))
          }}
          onFocus={() => setIsConfirmPasswordFocused(true)}
          placeholder="Re-enter your password"
          value={confirmPassword}
        />
        <PasswordRequirements
          confirmPassword={confirmPassword}
          password={password}
          showPasswordRules={false}
          visible={isConfirmPasswordFocused || confirmPassword.length > 0}
        />
        {fieldErrors.confirmPassword ? (
          <p className="text-sm text-danger">{fieldErrors.confirmPassword}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <Button className="w-full sm:w-auto sm:min-w-[9.25rem]" disabled={isPending} type="submit">
          {isPending ? 'Creating...' : 'Create'}
        </Button>

        <Link
          className="text-sm whitespace-normal text-[#00c573] underline decoration-[#00c573]/55 underline-offset-4 transition-[color,text-decoration-color] duration-200 ease-out hover:text-[#3ecf8e] hover:decoration-[#3ecf8e]"
          href={LOGIN_PATH}
        >
          Already registered? Sign in
        </Link>
      </div>

      {env.mockAuthEnabled ? (
        <p className="text-xs text-muted-foreground">
          UI-only mode: register/sign in with `{env.mockAuthEmail}` and `{env.mockAuthPassword}`.
        </p>
      ) : null}
    </form>
  )
}
