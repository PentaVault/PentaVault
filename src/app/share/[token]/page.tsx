'use client'

import { AlertTriangle, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { CopyButton } from '@/components/shared/copy-button'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { secretSharesApi } from '@/lib/api/secret-shares'
import { buildLoginRedirectPath } from '@/lib/auth/paths'
import type { PublicSecretShare } from '@/lib/types/models'
import { getApiErrorCode, getApiFriendlyMessage } from '@/lib/utils/errors'
import { formatDateTime } from '@/lib/utils/format'

export default function SharedSecretPage() {
  const params = useParams<{ token?: string }>()
  const routeToken = typeof params.token === 'string' ? params.token : ''
  const [fragmentToken, setFragmentToken] = useState('')
  const [fragmentReady, setFragmentReady] = useState(false)
  const token = routeToken || fragmentToken
  const [share, setShare] = useState<PublicSecretShare | null>(null)
  const [password, setPassword] = useState('')
  const [value, setValue] = useState<string | null>(null)
  const [wasRevealed, setWasRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [revealing, setRevealing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requiresLogin, setRequiresLogin] = useState(false)

  useEffect(() => {
    if (routeToken || typeof window === 'undefined') return
    try {
      setFragmentToken(decodeURIComponent(window.location.hash.slice(1)))
    } catch {
      setFragmentToken('')
    }
    setFragmentReady(true)
  }, [routeToken])

  useEffect(() => {
    let active = true
    if (!token && (routeToken || fragmentReady)) {
      setLoading(false)
      setError('This secret share is unavailable.')
      return
    }
    if (!token) return
    void secretSharesApi
      .inspect(token)
      .then((response) => {
        if (active) setShare(response.share)
      })
      .catch(() => {
        if (active) setError('This secret share is unavailable or has already expired.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [fragmentReady, routeToken, token])

  async function reveal() {
    if (!token) return
    setRevealing(true)
    setError(null)
    setRequiresLogin(false)
    try {
      const response = await secretSharesApi.access(token, password)
      setShare(response.share)
      setValue(response.value)
      setWasRevealed(true)
      setPassword('')
      window.history.replaceState(null, '', '/share')
    } catch (accessError) {
      const code = getApiErrorCode(accessError)
      setRequiresLogin(code === 'SECRET_SHARE_AUTH_REQUIRED')
      setError(
        getApiFriendlyMessage(
          accessError,
          'The secret could not be revealed. Check access requirements and try again.'
        )
      )
    } finally {
      setRevealing(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <section className="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono text-xs tracking-[0.12em] text-accent uppercase">
            <ShieldCheck className="h-4 w-4" />
            PentaVault secure share
          </div>
          <span className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground">
            No cache · No tracking
          </span>
        </div>

        {loading ? (
          <div className="py-14 text-center text-sm text-muted-foreground">
            Checking secure link...
          </div>
        ) : !share ? (
          <div className="py-12 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-warning" />
            <h1 className="mt-4 text-xl font-semibold">Share unavailable</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              {error ?? 'The link may be invalid, expired, revoked, or fully viewed.'}
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-accent/35 bg-accent/10">
              <LockKeyhole className="h-5 w-5 text-accent" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold">
              {share.name ?? 'A secret was shared with you'}
            </h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">{share.secretName}</p>

            <div className="mt-5 grid gap-2 rounded-lg border border-border bg-background-elevated p-3 text-xs text-muted-foreground sm:grid-cols-2">
              <span>Expires {formatDateTime(share.expiresAt)}</span>
              <span className="sm:text-right">
                {share.remainingViews} of {share.maxViews} views remain
              </span>
              <span>
                {share.accessScope === 'anyone'
                  ? 'Link access'
                  : share.accessScope === 'organization'
                    ? 'Organization account required'
                    : 'Verified recipient account required'}
              </span>
              <span className="sm:text-right">
                {share.passwordProtected ? 'Password protected' : 'No password'}
              </span>
            </div>

            {value === null && !wasRevealed ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-md border border-warning/35 bg-warning-muted p-3 text-xs text-warning">
                  Revealing consumes one view. Copy the value before leaving this page.
                </div>
                {share.passwordProtected ? (
                  <label
                    className="block space-y-1.5 text-xs text-muted-foreground"
                    htmlFor="share-access-password"
                  >
                    Share password
                    <PasswordInput
                      autoComplete="off"
                      id="share-access-password"
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter password"
                      value={password}
                    />
                  </label>
                ) : null}
                {error ? <p className="text-sm text-danger">{error}</p> : null}
                {requiresLogin ? (
                  <Button asChild className="w-full" variant="outline">
                    <Link href={`${buildLoginRedirectPath('/share')}#${encodeURIComponent(token)}`}>
                      Sign in to continue
                    </Link>
                  </Button>
                ) : null}
                <Button
                  className="w-full"
                  disabled={revealing || (share.passwordProtected && password.length === 0)}
                  onClick={() => void reveal()}
                >
                  <Eye className="h-4 w-4" />
                  {revealing ? 'Revealing...' : 'Reveal secret once'}
                </Button>
              </div>
            ) : value !== null ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-md border border-accent/35 bg-accent/8 p-4">
                  <p className="text-xs text-muted-foreground">Secret value</p>
                  <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all font-mono text-sm text-foreground">
                    {value}
                  </pre>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CopyButton idleLabel="Copy value" successLabel="Copied" value={value} />
                  <Button onClick={() => setValue(null)} variant="outline">
                    <EyeOff className="h-4 w-4" />
                    Clear from screen
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  PentaVault does not store this value in browser storage. Closing or clearing the
                  page removes this rendered copy.
                </p>
              </div>
            ) : (
              <div className="mt-6 rounded-md border border-border bg-background-elevated p-4">
                <p className="text-sm font-medium">Value cleared from this screen</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This browser will not reveal it again automatically. Reopen the link only if you
                  intend to consume another available view.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
