'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/api/auth'
import { DASHBOARD_HOME_PATH, LOGIN_PATH } from '@/lib/constants'
import { env } from '@/lib/env'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils/cn'
import { getApiFieldErrors, getApiFriendlyMessageWithRef } from '@/lib/utils/errors'

export function RegisterForm() {
  const router = useRouter()
  const auth = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

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
    } else if (password.length < 8) {
      nextFieldErrors.password = 'Password must be at least 8 characters long.'
    } else if (!/[0-9]/.test(password)) {
      nextFieldErrors.password = 'Password must include at least one number.'
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
      await authApi.signUpWithEmail({
        name: normalizedName,
        email: normalizedEmail,
        password,
      })

      toast.success('Account created. Sign in to continue.')
      router.replace(LOGIN_PATH)
      router.refresh()
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
        <Input
          autoComplete="new-password"
          className={cn(fieldErrors.password && 'border-danger focus-visible:ring-danger')}
          id="register-password"
          onChange={(event) => {
            setPassword(event.target.value)
            setFieldErrors((current) => ({ ...current, password: '' }))
          }}
          placeholder="At least 8 characters and one number"
          type="password"
          value={password}
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
        <Input
          autoComplete="new-password"
          className={cn(fieldErrors.confirmPassword && 'border-danger focus-visible:ring-danger')}
          id="register-password-confirm"
          onChange={(event) => {
            setConfirmPassword(event.target.value)
            setFieldErrors((current) => ({ ...current, confirmPassword: '' }))
          }}
          placeholder="Re-enter your password"
          type="password"
          value={confirmPassword}
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
          className="text-sm whitespace-wrap text-[#00c573] underline decoration-[#00c573]/55 underline-offset-4 transition-[color,text-decoration-color] duration-200 ease-out hover:text-[#3ecf8e] hover:decoration-[#3ecf8e]"
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
