'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/api/auth'
import { normalizeNextPath } from '@/lib/auth/paths'
import { DASHBOARD_HOME_PATH, REGISTER_PATH } from '@/lib/constants'
import { env } from '@/lib/env'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type LoginFormProps = {
  nextPath: string | null
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter()
  const { refresh } = useAuth()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) {
      setError('Email and password are required.')
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
      const message =
        env.mockAuthEnabled && submitError instanceof Error
          ? submitError.message
          : getApiFriendlyMessage(submitError, 'Unable to sign in right now.')
      setError(message)
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
          id="login-email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
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
          id="login-password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          type="password"
          value={password}
        />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <Button className="w-full sm:w-auto sm:min-w-[9.25rem]" disabled={isPending} type="submit">
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
