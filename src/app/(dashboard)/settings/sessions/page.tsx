'use client'

import { useEffect, useState } from 'react'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/lib/api/auth'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'
import { formatDateTime } from '@/lib/utils/format'

type SessionItem = {
  id: string
  current: boolean
  expiresAt: string | null
  ipAddress: string | null
  userAgent: string | null
  browser?: string | null
  os?: string | null
  device?: string | null
  location?: string | null
}

export default function SessionsPage() {
  const { toast } = useToast()
  const [isPending, setIsPending] = useState(false)
  const [sessions, setSessions] = useState<SessionItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refreshSessions(signal?: { cancelled: boolean }): Promise<void> {
    if (signal?.cancelled) {
      return
    }

    try {
      setIsPending(true)
      setError(null)
      const response = await authApi.listSessions()

      if (!signal?.cancelled) {
        setSessions(response.sessions)
      }
    } catch (refreshError) {
      if (!signal?.cancelled) {
        setError(getApiFriendlyMessage(refreshError, 'Unable to load sessions right now.'))
      }
    } finally {
      if (!signal?.cancelled) {
        setIsPending(false)
      }
    }
  }

  async function revokeSession(sessionId: string): Promise<void> {
    try {
      await authApi.revokeSession({ sessionId })
      toast.success('Session revoked successfully.')
      await refreshSessions()
    } catch (revokeError) {
      toast.error(getApiFriendlyMessage(revokeError, 'Unable to revoke this session.'))
    }
  }

  useEffect(() => {
    const signal = { cancelled: false }
    const timer = window.setTimeout(() => {
      void refreshSessions(signal)
    }, 0)

    return () => {
      window.clearTimeout(timer)
      signal.cancelled = true
    }
  }, [])

  return (
    <PageWrapper>
      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>Review and revoke account sessions when needed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            disabled={isPending}
            onClick={() => void refreshSessions()}
            type="button"
            variant="outline"
          >
            {isPending ? 'Refreshing...' : 'Refresh sessions'}
          </Button>

          {error ? (
            <ErrorState
              title="Unable to load sessions"
              message={error}
              onRetry={() => void refreshSessions()}
            />
          ) : null}

          {!error && !sessions ? (
            <p className="text-sm text-muted-foreground">
              Load sessions to view current and historical authenticated devices.
            </p>
          ) : !error && (sessions?.length ?? 0) === 0 ? (
            <EmptyState
              title="No sessions found"
              description="Once you sign in from another browser or device, your active sessions will appear here."
            />
          ) : !error ? (
            <div className="space-y-3">
              {(sessions ?? []).map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {session.current ? 'Current session' : 'Session'} {'\u2022'} {session.id}
                    </p>
                    <StatusBadge tone={session.current ? 'success' : 'neutral'}>
                      {session.current ? 'active current' : 'active'}
                    </StatusBadge>
                    <p className="text-xs text-muted-foreground">
                      expires: {formatDateTime(session.expiresAt)} {'\u2022'} IP:{' '}
                      {session.ipAddress ?? 'Unavailable'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.browser ?? 'Unknown browser'} {'\u2022'} {session.os ?? 'Unknown OS'}{' '}
                      {'\u2022'} {session.device ?? 'Unknown device'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      location: {session.location ?? 'Unavailable'}
                    </p>
                    {session.userAgent ? (
                      <p className="text-xs text-muted-foreground">agent: {session.userAgent}</p>
                    ) : null}
                  </div>

                  <Button
                    disabled={session.current}
                    onClick={() => void revokeSession(session.id)}
                    size="sm"
                    type="button"
                    variant="danger"
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
