'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/api/auth'
import { normalizeNextPath } from '@/lib/auth/paths'
import { DASHBOARD_HOME_PATH, REGISTER_PATH } from '@/lib/constants'
import { env } from '@/lib/env'
import { useAuth } from '@/lib/hooks/use-auth'
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
  const [isPending, setIsPending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [retryAfter, setRetryAfter] = useState<number | null>(null)

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
      await authApi.signInWithEmail({
        email: normalizedEmail,
        password,
      })

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
    } catch (submitError) {
      const fields = getApiFieldErrors(submitError)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        return
      }

      const payload = getApiErrorPayload(submitError)
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
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="login-password"
        >
          Password
        </label>
        <Input
          autoComplete="current-password"
          className={cn(fieldErrors.password && 'border-danger focus-visible:ring-danger')}
          id="login-password"
          onChange={(event) => {
            setPassword(event.target.value)
            setFieldErrors((current) => ({ ...current, password: '' }))
          }}
          placeholder="Enter your password"
          type="password"
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <Button
          className="w-full sm:w-auto sm:min-w-[9.25rem]"
          disabled={isPending || Boolean(retryAfter)}
          type="submit"
        >
          {isPending ? 'Signing in...' : 'Sign in'}
        </Button>

        <Link
          className="text-sm whitespace-wrap text-[#00c573] underline decoration-[#00c573]/55 underline-offset-4 transition-[color,text-decoration-color] duration-200 ease-out hover:text-[#3ecf8e] hover:decoration-[#3ecf8e]"
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
