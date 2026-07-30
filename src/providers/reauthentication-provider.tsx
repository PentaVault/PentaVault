'use client'

import { ShieldAlert } from 'lucide-react'
import { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { PasswordInput } from '@/components/ui/password-input'
import { authApi } from '@/lib/api/auth'
import { registerReauthenticationHandler } from '@/lib/api/reauthentication'
import { getApiErrorMessage } from '@/lib/utils/errors'

/**
 * Asks for the account password when a session is valid but no longer fresh.
 *
 * Sensitive operations — listing and revoking sessions, changing an email or
 * password, deleting the account — require a session created recently, so that a
 * cookie stolen hours ago cannot be used to take the account over. When one ages
 * past that window the API answers 403 and the request is held here until the
 * user proves they still know the password; the original request is then
 * replayed by the API client, so the action they asked for still happens.
 *
 * Deliberately not a redirect to the login page. Being bounced out mid-task and
 * losing what you were doing is how people learn to distrust a security prompt.
 */
export function ReauthenticationProvider({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  /**
   * Resolves the promise the API client is waiting on. Held in a ref because the
   * handler registered below must not be torn down and re-registered on every
   * keystroke, which is what a state-held resolver would cause.
   */
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null)

  const settle = useCallback((confirmed: boolean) => {
    const resolve = resolveRef.current
    resolveRef.current = null
    setOpen(false)
    setPassword('')
    setError(null)
    setSubmitting(false)
    resolve?.(confirmed)
  }, [])

  useEffect(() => {
    return registerReauthenticationHandler(
      () =>
        new Promise<boolean>((resolve) => {
          resolveRef.current = resolve
          setPassword('')
          setError(null)
          setOpen(true)
        })
    )
  }, [])

  // A promise left unresolved would hang the request that is waiting on it, so
  // unmounting has to settle it rather than simply dropping it.
  useEffect(() => {
    return () => {
      resolveRef.current?.(false)
      resolveRef.current = null
    }
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting || password.length === 0) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const confirmed = await authApi.reauthenticate(password)
      if (confirmed) {
        settle(true)
        return
      }
      // Stay open on a wrong password: closing would discard the action the user
      // was part-way through for the sake of one mistyped character.
      setError('That password is incorrect.')
      setPassword('')
      setSubmitting(false)
    } catch (caught) {
      setError(getApiErrorMessage(caught))
      setSubmitting(false)
    }
  }

  return (
    <>
      {children}
      <Dialog
        onOpenChange={(next) => {
          if (!next) {
            settle(false)
          }
        }}
        open={open}
      >
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/45" />
          <DialogContent className="fixed top-1/2 left-1/2 z-50 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <ShieldAlert className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold">Confirm your password</DialogTitle>
                  <DialogDescription className="mt-1 text-sm text-muted-foreground">
                    You have been signed in for a while. Confirm your password to continue — this
                    keeps a stolen session from being used to change your account.
                  </DialogDescription>
                </div>
              </div>

              <form className="space-y-3" onSubmit={handleSubmit}>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="reauthenticate-password">
                    Password
                  </label>
                  <PasswordInput
                    autoComplete="current-password"
                    // The dialog exists only to take this one input, and it
                    // interrupts something the user was already doing.
                    autoFocus
                    disabled={submitting}
                    id="reauthenticate-password"
                    onChange={(event) => setPassword(event.target.value)}
                    value={password}
                  />
                </div>

                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    disabled={submitting}
                    onClick={() => settle(false)}
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button disabled={submitting || password.length === 0} type="submit">
                    {submitting ? 'Confirming…' : 'Confirm'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  )
}
