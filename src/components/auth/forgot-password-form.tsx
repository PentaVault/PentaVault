'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useState } from 'react'

import { PasswordRequirements } from '@/components/auth/password-requirements'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { authApi } from '@/lib/api/auth'
import { isPasswordPolicySatisfied } from '@/lib/auth/password-policy'
import { LOGIN_PATH } from '@/lib/constants'
import { useEmailCooldown } from '@/lib/hooks/use-email-cooldown'
import { useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils/cn'
import {
  getApiErrorPayload,
  getApiFieldErrors,
  getApiFriendlyMessageWithRef,
} from '@/lib/utils/errors'

export function ForgotPasswordForm() {
  const router = useRouter()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [isResetStep, setIsResetStep] = useState(false)
  const [requiresMfa, setRequiresMfa] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false)
  const emailCooldown = useEmailCooldown()

  async function handleRequestSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setFieldErrors({ email: 'Please enter your email address.' })
      return
    }

    try {
      setIsPending(true)
      await authApi.requestPasswordResetOtp({ email: normalizedEmail })
      setEmail(normalizedEmail)
      setIsResetStep(true)
      emailCooldown.startCooldown(60)
      toast.success('Reset code sent. Check your email.')
    } catch (error) {
      const fields = getApiFieldErrors(error)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        return
      }

      const payload = getApiErrorPayload(error)
      if (payload?.code === 'RATE_LIMITED' && typeof payload.retryAfter === 'number') {
        emailCooldown.startCooldown(payload.retryAfter)
      }

      toast.error(
        getApiFriendlyMessageWithRef(error, 'Unable to send a password reset code right now.')
      )
    } finally {
      setIsPending(false)
    }
  }

  async function handleResetSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})

    const nextFieldErrors: Record<string, string> = {}
    const normalizedOtp = otp.trim()

    if (!normalizedOtp) {
      nextFieldErrors.otp = 'Enter the reset code from your email.'
    }

    if (!password) {
      nextFieldErrors.password = 'Enter a new password.'
    } else if (!isPasswordPolicySatisfied(password)) {
      nextFieldErrors.password =
        'Use at least 8 characters with uppercase, lowercase, number, and special characters.'
    }

    if (password !== confirmPassword) {
      nextFieldErrors.confirmPassword = 'Passwords do not match yet.'
    }

    if (requiresMfa && mfaCode.trim().length !== 6) {
      nextFieldErrors.mfaCode = 'Enter the 6-digit code.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    try {
      setIsPending(true)
      const resetResult = await authApi.resetPasswordWithOtp({
        email,
        otp: normalizedOtp,
        password,
        ...(requiresMfa ? { totpCode: mfaCode.trim() } : {}),
      })

      if (resetResult.requiresMfa) {
        setRequiresMfa(true)
        toast.info('Enter your authenticator code.')
        return
      }

      toast.success('Password reset. Sign in with your new password.')
      router.replace(LOGIN_PATH)
    } catch (error) {
      const fields = getApiFieldErrors(error)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        return
      }

      const payload = getApiErrorPayload(error)
      if (payload?.code === 'AUTH_MFA_CODE_INVALID') {
        setFieldErrors({ mfaCode: 'The authentication code is invalid.' })
      }

      toast.error(getApiFriendlyMessageWithRef(error, 'Unable to reset this password right now.'))
    } finally {
      setIsPending(false)
    }
  }

  async function handleResendCode(): Promise<void> {
    if (emailCooldown.isOnCooldown || !email) {
      return
    }

    try {
      setIsPending(true)
      await authApi.requestPasswordResetOtp({ email })
      emailCooldown.startCooldown(60)
      toast.success('Reset code sent.')
    } catch (error) {
      const payload = getApiErrorPayload(error)
      if (payload?.code === 'RATE_LIMITED' && typeof payload.retryAfter === 'number') {
        emailCooldown.startCooldown(payload.retryAfter)
      }

      toast.error(getApiFriendlyMessageWithRef(error, 'Unable to resend the reset code.'))
    } finally {
      setIsPending(false)
    }
  }

  if (!isResetStep) {
    return (
      <form className="space-y-4" onSubmit={(event) => void handleRequestSubmit(event)}>
        <div className="space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor="forgot-email"
          >
            Email
          </label>
          <Input
            autoComplete="email"
            className={cn(fieldErrors.email && 'border-danger focus-visible:ring-danger')}
            id="forgot-email"
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <Button
            className="w-full sm:w-auto sm:min-w-[9.25rem]"
            disabled={isPending || emailCooldown.isOnCooldown}
            type="submit"
          >
            {emailCooldown.isOnCooldown
              ? `Wait ${emailCooldown.secondsLeft}s`
              : isPending
                ? 'Sending...'
                : 'Send code'}
          </Button>
          <Link
            className="text-sm text-[#00c573] underline decoration-[#00c573]/55 underline-offset-4 transition-[color,text-decoration-color] duration-200 ease-out hover:text-[#3ecf8e] hover:decoration-[#3ecf8e]"
            href={LOGIN_PATH}
          >
            Back to sign in
          </Link>
        </div>
      </form>
    )
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void handleResetSubmit(event)}>
      <div className="rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-muted-foreground">
        Code sent to <span className="font-medium text-foreground">{email}</span>.
      </div>

      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="forgot-otp"
        >
          Reset code
        </label>
        <Input
          autoComplete="one-time-code"
          className={cn(
            'h-11 text-center font-mono text-base tracking-[0.4em]',
            fieldErrors.otp && 'border-danger focus-visible:ring-danger'
          )}
          id="forgot-otp"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => {
            setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
            setFieldErrors((current) => ({ ...current, otp: '' }))
          }}
          placeholder="000000"
          value={otp}
        />
        {fieldErrors.otp ? <p className="text-sm text-danger">{fieldErrors.otp}</p> : null}
      </div>

      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="forgot-password"
        >
          New password
        </label>
        <PasswordInput
          autoComplete="new-password"
          className={cn(fieldErrors.password && 'border-danger focus-visible:ring-danger')}
          id="forgot-password"
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
          htmlFor="forgot-confirm-password"
        >
          Confirm password
        </label>
        <PasswordInput
          autoComplete="new-password"
          className={cn(fieldErrors.confirmPassword && 'border-danger focus-visible:ring-danger')}
          id="forgot-confirm-password"
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

      {requiresMfa ? (
        <div className="space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor="forgot-mfa-code"
          >
            Authenticator code
          </label>
          <Input
            autoComplete="one-time-code"
            className={cn(
              'h-11 text-center font-mono text-base tracking-[0.4em]',
              fieldErrors.mfaCode && 'border-danger focus-visible:ring-danger'
            )}
            id="forgot-mfa-code"
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
      ) : null}

      <div className="space-y-3">
        <Button className="w-full" disabled={isPending} type="submit">
          {isPending ? 'Resetting...' : 'Reset password'}
        </Button>
        <button
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending || emailCooldown.isOnCooldown}
          onClick={() => void handleResendCode()}
          type="button"
        >
          {emailCooldown.isOnCooldown ? `Resend in ${emailCooldown.secondsLeft}s` : 'Resend code'}
        </button>
        <button
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          onClick={() => {
            setIsResetStep(false)
            setRequiresMfa(false)
            setOtp('')
            setPassword('')
            setConfirmPassword('')
            setMfaCode('')
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
