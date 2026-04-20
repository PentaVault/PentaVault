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
import { getApiFriendlyMessage } from '@/lib/utils/errors'

export function RegisterForm() {
  const router = useRouter()
  const auth = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (auth.status === 'authenticated') {
      router.replace(DASHBOARD_HOME_PATH)
    }
  }, [auth.status, router])

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    const normalizedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedName || !normalizedEmail || !password || !confirmPassword) {
      setError('Name, email, password, and confirmation are required.')
      return
    }

    if (password.length < 12) {
      setError('Password must be at least 12 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
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
      const message =
        env.mockAuthEnabled && submitError instanceof Error
          ? submitError.message
          : getApiFriendlyMessage(submitError, 'Unable to create account right now.')
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
          htmlFor="register-name"
        >
          Full name
        </label>
        <Input
          autoComplete="name"
          id="register-name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Alex Rivera"
          value={name}
        />
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
          id="register-email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
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
          id="register-password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 12 characters"
          type="password"
          value={password}
        />
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
          id="register-password-confirm"
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Re-enter your password"
          type="password"
          value={confirmPassword}
        />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

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
