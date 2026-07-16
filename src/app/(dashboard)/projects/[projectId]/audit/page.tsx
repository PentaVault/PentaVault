'use client'

import { CheckCircle2, Download, Loader2, XCircle } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { auditApi } from '@/lib/api/audit'
import { getOrgProjectPath, getProjectPath } from '@/lib/constants'
import { useAudit } from '@/lib/hooks/use-audit'
import { useProject } from '@/lib/hooks/use-projects'
import { useProjectMembers } from '@/lib/hooks/use-team'
import type { AuditEvent } from '@/lib/types/models'
import { getApiFriendlyMessage } from '@/lib/utils/errors'
import { formatDateTime } from '@/lib/utils/format'

const DEFAULT_LIMIT = 25

export default function ProjectAuditPage() {
  const params = useParams<{ orgId?: string; projectId: string }>()
  const router = useRouter()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null

  const [eventType, setEventType] = useState('')
  const [outcome, setOutcome] = useState<'all' | 'success' | 'failure'>('all')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null])
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'jsonl' | null>(null)
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

  const membersQuery = useProjectMembers(projectId, canReadAudit)
  const memberNames = useMemo(() => {
    return new Map(
      (membersQuery.data?.members ?? []).map((member) => [
        member.userId,
        member.user?.name || member.user?.email || member.userId,
      ])
    )
  }, [membersQuery.data?.members])
  const cursor = pageCursors[pageIndex] ?? null
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

  const rawEvents = auditQuery.data?.events ?? []
  const events = eventType.trim()
    ? rawEvents
    : rawEvents.filter((event) => event.eventType !== 'projects.audit.read')
  const hiddenReadEventCount = rawEvents.length - events.length
  const nextCursor = auditQuery.data?.nextCursor ?? null

  function resetPagination(): void {
    setPageIndex(0)
    setPageCursors([null])
  }

  async function exportAudit(format: 'csv' | 'jsonl'): Promise<void> {
    if (!projectId || exportingFormat) return

    setExportingFormat(format)
    try {
      const blob = await auditApi.exportProjectAudit(projectId, {
        format,
        maxRecords: 5000,
        ...(eventType.trim() ? { eventType: eventType.trim() } : {}),
        ...(outcome === 'all' ? {} : { outcome }),
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `pentavault-audit-${projectId}.${format}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast.success(`Audit ${format.toUpperCase()} exported.`)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to export audit events right now.'))
    } finally {
      setExportingFormat(null)
    }
  }

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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                className="rounded-md border border-border bg-background-elevated px-3 py-2 text-sm"
                onChange={(event) => {
                  resetPagination()
                  setEventType(event.target.value)
                }}
                placeholder="Filter by event type"
                value={eventType}
              />

              <Select
                onValueChange={(nextOutcome) => {
                  resetPagination()
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
                  resetPagination()
                  void auditQuery.refetch()
                }}
                type="button"
              >
                Refresh
              </button>

              <div className="flex gap-2">
                {(['csv', 'jsonl'] as const).map((format) => (
                  <button
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-border-strong hover:bg-card-elevated disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={exportingFormat !== null}
                    key={format}
                    onClick={() => void exportAudit(format)}
                    type="button"
                  >
                    {exportingFormat === format ? (
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                    ) : (
                      <Download aria-hidden="true" className="size-4" />
                    )}
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>
              {auditQuery.isLoading
                ? 'Loading events...'
                : `Showing ${events.length} event${events.length === 1 ? '' : 's'} on this page${
                    hiddenReadEventCount > 0
                      ? `, excluding ${hiddenReadEventCount} old audit-read event${hiddenReadEventCount === 1 ? '' : 's'}`
                      : ''
                  }.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditQuery.isError ? (
              <p className="text-sm text-danger">
                {getApiFriendlyMessage(auditQuery.error, 'Unable to load audit events right now.')}
              </p>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events match the current filters.</p>
            ) : (
              <div className="space-y-3">
                {events.map((event) => {
                  const summary = describeAuditEvent(event, memberNames)

                  return (
                    <div key={event.id} className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{summary.sentence}</p>
                        <AuditOutcomeIcon outcome={event.outcome} />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{summary.detail}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDateTime(event.occurredAt)} · Actor: {summary.actor} · Target:{' '}
                        {summary.target} · Raw event: {event.eventType}
                      </p>
                      {event.failureReason ? (
                        <p className="mt-1 text-xs text-danger">failure: {event.failureReason}</p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                type="button"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">Page {pageIndex + 1}</span>
              <button
                className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
                disabled={!nextCursor}
                onClick={() => {
                  if (!nextCursor) return
                  setPageCursors((current) => {
                    const next = current.slice(0, pageIndex + 1)
                    next[pageIndex + 1] = nextCursor
                    return next
                  })
                  setPageIndex((current) => current + 1)
                }}
                type="button"
              >
                Next
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}

function AuditOutcomeIcon({ outcome }: { outcome: AuditEvent['outcome'] }) {
  const isSuccess = outcome === 'success'
  const Icon = isSuccess ? CheckCircle2 : XCircle

  return (
    <span
      aria-label={isSuccess ? 'Successful event' : 'Failed event'}
      className={
        isSuccess
          ? 'inline-flex h-6 w-6 items-center justify-center rounded-full text-success'
          : 'inline-flex h-6 w-6 items-center justify-center rounded-full text-danger'
      }
      role="img"
      title={isSuccess ? 'Successful event' : 'Failed event'}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  )
}

function describeAuditEvent(event: AuditEvent, memberNames: Map<string, string>) {
  const actor = event.actorUserId
    ? (memberNames.get(event.actorUserId) ?? shortId(event.actorUserId))
    : 'System'
  const targetUserId = stringMetadata(event.metadata, 'targetUserId')
  const targetUser = targetUserId ? (memberNames.get(targetUserId) ?? shortId(targetUserId)) : null
  const secretName =
    stringMetadata(event.metadata, 'secretName') ??
    stringMetadata(event.metadata, 'targetName') ??
    (event.secretId ? shortId(event.secretId) : null)
  const failed = event.outcome === 'failure'

  switch (event.eventType) {
    case 'secrets.access.granted':
      return {
        actor,
        target: targetUser ?? 'a member',
        sentence: `${actor} granted ${targetUser ?? 'a member'} access to ${secretName ?? 'a variable'}.`,
        detail: failed
          ? 'Access was not granted. Review the failure reason below for the backend error.'
          : `The member can now use ${event.metadata.reusedToken ? 'their existing active proxy token' : 'a new proxy token'} for this variable. The original secret value was not exposed.`,
      }
    case 'secrets.access.revoked':
      return {
        actor,
        target: targetUser ?? 'a member',
        sentence: `${actor} removed ${targetUser ?? 'a member'}'s access to ${secretName ?? 'a variable'}.`,
        detail: failed
          ? 'Access was not removed. Review the failure reason below for the backend error.'
          : `${numberMetadata(event.metadata, 'revokedTokenCount') ?? 0} active proxy token(s) were disabled, and stale pending requests for this variable were marked reviewed.`,
      }
    case 'tokens.revoked':
      return {
        actor,
        target: event.tokenId ? shortId(event.tokenId) : 'a proxy token',
        sentence: `${actor} disabled a proxy token.`,
        detail: failed
          ? 'The proxy token is still usable unless another event shows it was disabled later.'
          : 'The proxy token can no longer resolve the variable value.',
      }
    case 'tokens.created':
    case 'tokens.batch_created':
      return {
        actor,
        target: event.tokenId ? shortId(event.tokenId) : 'proxy tokens',
        sentence: `${actor} created proxy token access.`,
        detail: failed
          ? 'No new usable proxy token was created.'
          : 'The raw proxy token was shown only once at creation time; later views show only the stored token reference.',
      }
    case 'secrets.updated':
      return {
        actor,
        target: secretName ?? 'a variable',
        sentence: `${actor} updated ${secretName ?? 'a variable'}.`,
        detail: failed
          ? 'The variable value was not changed.'
          : `A new encrypted version was stored. Current version: ${numberMetadata(event.metadata, 'versionNumber') ?? 'unknown'}.`,
      }
    case 'secrets.version_restored':
      return {
        actor,
        target: secretName ?? 'a variable',
        sentence: `${actor} restored ${secretName ?? 'a variable'} to an older version.`,
        detail: failed
          ? 'The older value was not restored.'
          : `The restore created a fresh active version (${numberMetadata(event.metadata, 'versionNumber') ?? 'unknown'}) while keeping history intact.`,
      }
    case 'projects.audit.read':
      return {
        actor,
        target: 'the audit log',
        sentence: `${actor} viewed the audit log.`,
        detail:
          'Audit-log views are access events for compliance, but they are hidden from the default list to reduce noise.',
      }
    default:
      return {
        actor,
        target: event.secretId ? shortId(event.secretId) : (event.projectId ?? 'project'),
        sentence: `${actor} performed ${event.eventType.replaceAll('.', ' ')}.`,
        detail: failed
          ? 'The backend rejected or could not complete this action.'
          : 'The backend recorded this project event. Use the raw event name to filter related entries.',
      }
  }
}

function stringMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'string' ? value : null
}

function numberMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'number' ? value : null
}

function shortId(value: string) {
  return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value
}
