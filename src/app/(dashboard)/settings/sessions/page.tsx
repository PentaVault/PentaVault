'use client'

import { useEffect, useState } from 'react'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/lib/api/auth'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'
import { formatDateTime } from '@/lib/utils/format'

export default function SessionsPage() {
  const { toast } = useToast()
  const [isPending, setIsPending] = useState(false)
  const [sessions, setSessions] = useState<Array<{
    id: string
    current: boolean
    expiresAt: string | null
    ipAddress: string | null
    userAgent: string | null
  }> | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refreshSessions(signal?: { cancelled: boolean }): Promise<void> {
    if (signal?.cancelled) {
      return
    }

    try {
      setIsPending(true)
      setError(null)
      const response = await authApi.listSessions()

      if (signal?.cancelled) {
        return
      }

      setSessions(response.sessions)
    } catch (refreshError) {
      if (signal?.cancelled) {
        return
      }

      setError(getApiFriendlyMessage(refreshError, 'Unable to load sessions right now.'))
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
    const signal = {
      cancelled: false,
    }

    async function bootstrapSessions(): Promise<void> {
      await refreshSessions(signal)
    }

    void bootstrapSessions()

    return () => {
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

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          {!sessions ? (
            <p className="text-sm text-muted-foreground">
              Load sessions to view current and historical authenticated devices.
            </p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active sessions found.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {session.current ? 'Current session' : 'Session'} • {session.id}
                    </p>
                    <StatusBadge tone={session.current ? 'success' : 'neutral'}>
                      {session.current ? 'active current' : 'active'}
                    </StatusBadge>
                    <p className="text-xs text-muted-foreground">
                      expires: {formatDateTime(session.expiresAt)} • ip:{' '}
                      {session.ipAddress ?? 'n/a'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      agent: {session.userAgent ?? 'n/a'}
                    </p>
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
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
