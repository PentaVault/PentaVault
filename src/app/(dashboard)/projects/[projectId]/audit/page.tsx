'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { StatusBadge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getOrgProjectPath, getProjectPath } from '@/lib/constants'
import { useAudit } from '@/lib/hooks/use-audit'
import { useProject } from '@/lib/hooks/use-projects'
import { formatDateTime } from '@/lib/utils/format'

const DEFAULT_LIMIT = 25

export default function ProjectAuditPage() {
  const params = useParams<{ orgId?: string; projectId: string }>()
  const router = useRouter()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null

  const [eventType, setEventType] = useState('')
  const [outcome, setOutcome] = useState<'all' | 'success' | 'failure'>('all')
  const [cursor, setCursor] = useState<string | null>(null)
  const projectQuery = useProject(projectId)
  const effectiveRole = projectQuery.data?.effectiveRole ?? projectQuery.data?.orgRole ?? null
  const canReadAudit =
    effectiveRole === 'owner' || effectiveRole === 'admin' || effectiveRole === 'auditor'
  const overviewPath = projectId
    ? params.orgId
      ? getOrgProjectPath(params.orgId, projectId)
      : getProjectPath(projectId)
    : null

  useEffect(() => {
    if (!projectQuery.isLoading && projectQuery.data && !canReadAudit && overviewPath) {
      router.replace(overviewPath)
    }
  }, [canReadAudit, overviewPath, projectQuery.data, projectQuery.isLoading, router])

  const query = useMemo(
    () => ({
      limit: DEFAULT_LIMIT,
      ...(cursor ? { cursor } : {}),
      ...(eventType.trim() ? { eventType: eventType.trim() } : {}),
      ...(outcome === 'all' ? {} : { outcome }),
    }),
    [cursor, eventType, outcome]
  )

  const auditQuery = useAudit(projectId, query, canReadAudit)

  const events = auditQuery.data?.events ?? []
  const nextCursor = auditQuery.data?.nextCursor ?? null

  if (projectQuery.isLoading) {
    return (
      <PageWrapper>
        <Card>
          <CardHeader>
            <CardTitle>Audit log</CardTitle>
            <CardDescription>Loading project permissions...</CardDescription>
          </CardHeader>
        </Card>
      </PageWrapper>
    )
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <PageWrapper>
        <Card>
          <CardHeader>
            <CardTitle>Audit log unavailable</CardTitle>
            <CardDescription>
              The selected project could not be loaded or you do not have access.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageWrapper>
    )
  }

  if (!canReadAudit) {
    return (
      <PageWrapper>
        <Card>
          <CardHeader>
            <CardTitle>Audit log</CardTitle>
            <CardDescription>Redirecting to the project overview...</CardDescription>
          </CardHeader>
        </Card>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Audit log</CardTitle>
            <CardDescription>
              Review project-scoped security events with backend-supported filtering.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                className="rounded-md border border-border bg-background-elevated px-3 py-2 text-sm"
                onChange={(event) => {
                  setCursor(null)
                  setEventType(event.target.value)
                }}
                placeholder="Filter by event type"
                value={eventType}
              />

              <Select
                onValueChange={(nextOutcome) => {
                  setCursor(null)
                  setOutcome(nextOutcome as 'all' | 'success' | 'failure')
                }}
                value={outcome}
              >
                <SelectTrigger aria-label="Audit outcome filter">
                  <SelectValue placeholder="All outcomes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All outcomes</SelectItem>
                    <SelectItem value="success">Success only</SelectItem>
                    <SelectItem value="failure">Failure only</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <button
                className="rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-border-strong hover:bg-card-elevated"
                onClick={() => {
                  setCursor(null)
                  void auditQuery.refetch()
                }}
                type="button"
              >
                Refresh
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>
              {auditQuery.isLoading
                ? 'Loading events...'
                : `${events.length} event${events.length === 1 ? '' : 's'} returned`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditQuery.isError ? (
              <p className="text-sm text-danger">Unable to load audit events right now.</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events match the current filters.</p>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{event.eventType}</p>
                      <StatusBadge tone={event.outcome === 'success' ? 'success' : 'danger'}>
                        {event.outcome}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(event.occurredAt)} • route: {event.route ?? 'n/a'}
                    </p>
                    {event.failureReason ? (
                      <p className="mt-1 text-xs text-danger">failure: {event.failureReason}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
                disabled={!nextCursor}
                onClick={() => setCursor(nextCursor)}
                type="button"
              >
                Load more
              </button>

              {cursor ? (
                <button
                  className="rounded-md border border-border px-3 py-2 text-sm"
                  onClick={() => setCursor(null)}
                  type="button"
                >
                  Reset cursor
                </button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
