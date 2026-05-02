'use client'

import { RefreshCw } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getOrgProjectPath, getProjectPath } from '@/lib/constants'
import { useProjectAnalytics } from '@/lib/hooks/use-analytics'
import { useProjectEnvironments } from '@/lib/hooks/use-project-configuration'
import { useProject } from '@/lib/hooks/use-projects'
import { useProjectSecrets } from '@/lib/hooks/use-secrets'
import { useProjectMembers } from '@/lib/hooks/use-team'
import type { SecretAccessEvent } from '@/lib/types/models'
import { formatDateTime, formatNumber } from '@/lib/utils/format'

const DEFAULT_ANALYTICS_LIMIT = 100
const CHART_COLORS = ['#3ecf8e', '#d9a441', '#d55b73', '#60a5fa', '#a78bfa', '#f97316']

type CountRow = {
  id: string
  label: string
  count: number
  lastAccess: string | null
}

type TimelineLine = {
  key: string
  label: string
  color: string
}

export default function ProjectAnalyticsPage() {
  const params = useParams<{ orgId?: string; projectId: string }>()
  const router = useRouter()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null

  const projectQuery = useProject(projectId)
  const effectiveRole = projectQuery.data?.effectiveRole ?? projectQuery.data?.orgRole ?? null
  const canReadAnalytics = effectiveRole === 'owner' || effectiveRole === 'admin'
  const overviewPath = projectId
    ? params.orgId
      ? getOrgProjectPath(params.orgId, projectId)
      : getProjectPath(projectId)
    : null

  useEffect(() => {
    if (!projectQuery.isLoading && projectQuery.data && !canReadAnalytics && overviewPath) {
      router.replace(overviewPath)
    }
  }, [canReadAnalytics, overviewPath, projectQuery.data, projectQuery.isLoading, router])

  const analyticsQuery = useProjectAnalytics(
    projectId,
    { granularity: 'hour', limit: DEFAULT_ANALYTICS_LIMIT },
    canReadAnalytics
  )
  const environmentsQuery = useProjectEnvironments(projectId, canReadAnalytics)
  const secretsQuery = useProjectSecrets(projectId, canReadAnalytics)
  const membersQuery = useProjectMembers(projectId, canReadAnalytics)

  const events = useMemo(
    () => analyticsQuery.data?.events ?? analyticsQuery.data?.summary.recentEvents ?? [],
    [analyticsQuery.data]
  )
  const summary = analyticsQuery.data?.summary

  const secretNames = useMemo(() => {
    return new Map((secretsQuery.data ?? []).map((secret) => [secret.id, secret.name]))
  }, [secretsQuery.data])

  const memberNames = useMemo(() => {
    return new Map(
      (membersQuery.data?.members ?? []).map((member) => [
        member.userId,
        member.user?.name || member.user?.email || shortId(member.userId),
      ])
    )
  }, [membersQuery.data])

  const environmentNames = useMemo(() => {
    return new Map((environmentsQuery.data?.environments ?? []).map((env) => [env.id, env.name]))
  }, [environmentsQuery.data])

  const topSecrets = useMemo(
    () =>
      countEvents(events, (event) => event.secretId).map((row) => ({
        ...row,
        label: secretNames.get(row.id) ?? shortId(row.id),
      })),
    [events, secretNames]
  )

  const userActivity = useMemo(
    () =>
      countEvents(events, (event) => event.userId).map((row) => ({
        ...row,
        label: memberNames.get(row.id) ?? shortId(row.id),
      })),
    [events, memberNames]
  )

  const deviceRows = useMemo(
    () =>
      countEvents(events, (event) => event.deviceFingerprint).map((row) => ({
        ...row,
        label: shortId(row.id),
      })),
    [events]
  )

  const ipRows = useMemo(() => countEvents(events, (event) => event.ipAddress), [events])

  const { timelineData, timelineLines } = useMemo(
    () => buildTimeline(events, environmentNames),
    [events, environmentNames]
  )

  const modeData = useMemo(() => {
    const direct = summary?.accessByMode.direct ?? 0
    const proxy = summary?.accessByMode.proxy ?? 0
    return [
      { name: 'Direct', value: direct },
      { name: 'Proxy', value: proxy },
    ].filter((row) => row.value > 0)
  }, [summary])

  if (projectQuery.isLoading) {
    return (
      <PageWrapper>
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
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
            <CardTitle>Analytics unavailable</CardTitle>
            <CardDescription>
              The selected project could not be loaded or you do not have access.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageWrapper>
    )
  }

  if (!canReadAnalytics) {
    return (
      <PageWrapper>
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>Redirecting to the project overview...</CardDescription>
          </CardHeader>
        </Card>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl tracking-[-0.16px] text-foreground">Analytics</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Secret access activity, proxy behavior, and recent resolve events for this project.
            </p>
          </div>
          <Button
            disabled={analyticsQuery.isFetching}
            onClick={() => void analyticsQuery.refetch()}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {analyticsQuery.isError ? (
          <Card>
            <CardHeader>
              <CardTitle>Unable to load analytics</CardTitle>
              <CardDescription>
                Analytics data is unavailable right now. Retry after the backend is reachable.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total accesses" value={formatNumber(summary?.totalAccesses ?? 0)} />
          <MetricCard label="Unique users" value={formatNumber(summary?.uniqueUsers ?? 0)} />
          <MetricCard label="Error rate" value={formatPercent(summary?.errorRate ?? 0)} />
          <MetricCard
            label="Avg latency"
            value={formatLatency(summary?.avgResponseTimeMs ?? null)}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Access Timeline</CardTitle>
              <CardDescription>Recent access events grouped by environment.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 min-h-72">
                {timelineData.length === 0 ? (
                  <EmptyChartState label="No access events in the current window." />
                ) : (
                  <ResponsiveContainer height="100%" width="100%">
                    <LineChart data={timelineData}>
                      <CartesianGrid stroke="rgba(250,250,250,0.08)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="var(--muted-foreground)"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis allowDecimals={false} stroke="var(--muted-foreground)" width={36} />
                      <Tooltip contentStyle={tooltipStyle} />
                      {timelineLines.map((line) => (
                        <Line
                          dataKey={line.key}
                          dot={false}
                          key={line.key}
                          name={line.label}
                          stroke={line.color}
                          strokeWidth={2}
                          type="monotone"
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Access Mode</CardTitle>
              <CardDescription>Direct injection compared with proxy mode.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 min-h-72">
                {modeData.length === 0 ? (
                  <EmptyChartState label="No mode data yet." />
                ) : (
                  <ResponsiveContainer height="100%" width="100%">
                    <PieChart>
                      <Pie data={modeData} dataKey="value" innerRadius={54} nameKey="name">
                        {modeData.map((row, index) => (
                          <Cell fill={CHART_COLORS[index % CHART_COLORS.length]} key={row.name} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <ModeStat label="Direct" value={summary?.accessByMode.direct ?? 0} />
                <ModeStat label="Proxy" value={summary?.accessByMode.proxy ?? 0} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Top Secrets</CardTitle>
              <CardDescription>Most accessed secrets in the returned event set.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 min-h-72">
                {topSecrets.length === 0 ? (
                  <EmptyChartState label="No secret activity yet." />
                ) : (
                  <ResponsiveContainer height="100%" width="100%">
                    <BarChart data={topSecrets.slice(0, 8)}>
                      <CartesianGrid stroke="rgba(250,250,250,0.08)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="var(--muted-foreground)"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis allowDecimals={false} stroke="var(--muted-foreground)" width={36} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">User Activity</CardTitle>
              <CardDescription>Project members with recent secret access.</CardDescription>
            </CardHeader>
            <CardContent>
              <AnalyticsTable
                emptyLabel="No user activity yet."
                rows={userActivity.slice(0, 8)}
                valueLabel="Accesses"
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Recent Events</CardTitle>
              <CardDescription>Last {DEFAULT_ANALYTICS_LIMIT} analytics events.</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events have been recorded yet.</p>
              ) : (
                <div className="max-h-96 overflow-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Secret</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">{event.eventType}</TableCell>
                          <TableCell>{event.accessMode}</TableCell>
                          <TableCell>
                            {secretNames.get(event.secretId) ?? shortId(event.secretId)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge tone={event.errorCode ? 'danger' : 'success'}>
                              {event.errorCode ?? event.upstreamStatus ?? 'ok'}
                            </StatusBadge>
                          </TableCell>
                          <TableCell>{formatDateTime(event.occurredAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Devices</CardTitle>
                <CardDescription>Unique fingerprints seen in recent access events.</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsTable
                  emptyLabel="No device fingerprints recorded."
                  rows={deviceRows.slice(0, 6)}
                  valueLabel="Events"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">IP Addresses</CardTitle>
                <CardDescription>Source IPs seen in recent access events.</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsTable
                  emptyLabel="No source IPs recorded."
                  rows={ipRows.slice(0, 6)}
                  valueLabel="Events"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="space-y-1 pb-3">
        <CardDescription className="font-mono text-[11px] tracking-[0.12em] uppercase">
          {label}
        </CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function ModeStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background-elevated px-3 py-2">
      <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-lg text-foreground">{formatNumber(value)}</p>
    </div>
  )
}

function AnalyticsTable({
  emptyLabel,
  rows,
  valueLabel,
}: {
  emptyLabel: string
  rows: CountRow[]
  valueLabel: string
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <div className="overflow-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>{valueLabel}</TableHead>
            <TableHead>Last seen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="max-w-44 truncate font-medium">{row.label}</TableCell>
              <TableCell>{formatNumber(row.count)}</TableCell>
              <TableCell>{formatDateTime(row.lastAccess)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function EmptyChartState({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-72 items-center justify-center rounded-md border border-border text-sm text-muted-foreground">
      {label}
    </div>
  )
}

function countEvents(
  events: SecretAccessEvent[],
  selectId: (event: SecretAccessEvent) => string | null
): CountRow[] {
  const counts = new Map<string, CountRow>()

  for (const event of events) {
    const id = selectId(event)

    if (!id) {
      continue
    }

    const current = counts.get(id) ?? { id, label: id, count: 0, lastAccess: null }
    current.count += 1

    if (!current.lastAccess || event.occurredAt > current.lastAccess) {
      current.lastAccess = event.occurredAt
    }

    counts.set(id, current)
  }

  return [...counts.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count
    }

    return (right.lastAccess ?? '').localeCompare(left.lastAccess ?? '')
  })
}

function buildTimeline(events: SecretAccessEvent[], environmentNames: Map<string, string>) {
  const environmentIds = [...new Set(events.map((event) => event.environmentId ?? 'unscoped'))]
  const timelineLines: TimelineLine[] = environmentIds.map((environmentId, index) => ({
    key: `environment${index}`,
    label:
      environmentId === 'unscoped'
        ? 'Unscoped'
        : (environmentNames.get(environmentId) ?? shortId(environmentId)),
    color: CHART_COLORS[index % CHART_COLORS.length],
  }))
  const lineKeyByEnvironmentId = new Map(
    environmentIds.map((environmentId, index) => [environmentId, `environment${index}`])
  )
  const buckets = new Map<string, Record<string, number | string>>()

  for (const event of events) {
    const bucket = hourBucket(event.occurredAt)
    const environmentId = event.environmentId ?? 'unscoped'
    const lineKey = lineKeyByEnvironmentId.get(environmentId)

    if (!lineKey) {
      continue
    }

    const row = buckets.get(bucket.key) ?? { label: bucket.label }
    row[lineKey] = Number(row[lineKey] ?? 0) + 1
    buckets.set(bucket.key, row)
  }

  const timelineData = [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value)

  return { timelineData, timelineLines }
}

function hourBucket(value: string) {
  const date = new Date(value)
  date.setMinutes(0, 0, 0)

  return {
    key: date.toISOString(),
    label: new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
    }).format(date),
  }
}

function shortId(value: string) {
  return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value
}

function formatPercent(value: number) {
  return `${Math.round(value * 1000) / 10}%`
}

function formatLatency(value: number | null) {
  return value === null ? 'N/A' : `${Math.round(value)} ms`
}

const tooltipStyle = {
  backgroundColor: 'var(--card-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--foreground)',
}
