'use client'

import { useQueries } from '@tanstack/react-query'
import { Activity, Link2, Loader2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { secretsApi } from '@/lib/api/secrets'
import { useInfiniteOrganizationActivity } from '@/lib/hooks/use-audit'
import { useAuth } from '@/lib/hooks/use-auth'
import { useProjectsQuery } from '@/lib/hooks/use-projects'
import { useOrganizationMembers } from '@/lib/hooks/use-team'
import type { AuditEvent } from '@/lib/types/models'
import { cn } from '@/lib/utils/cn'
import { copyToClipboard } from '@/lib/utils/copy'
import { getApiFriendlyMessage } from '@/lib/utils/errors'
import { formatDateTime } from '@/lib/utils/format'

const ACTIVITY_PAGE_SIZE = 20

export default function OrganizationActivityPage() {
  const params = useParams<{ orgId?: string }>()
  const searchParams = useSearchParams()
  const auth = useAuth()
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const didScrollToHighlightedRef = useRef(false)
  const orgId =
    typeof params.orgId === 'string'
      ? params.orgId
      : (auth.activeOrganization?.organization.id ?? null)
  const highlightedEventId = searchParams.get('event')
  const query = useMemo(() => ({ limit: ACTIVITY_PAGE_SIZE }), [])
  const activityQuery = useInfiniteOrganizationActivity(orgId, query)
  const projectsQuery = useProjectsQuery()
  const membersQuery = useOrganizationMembers(orgId)
  const memberNames = useMemo(() => {
    return new Map(
      (membersQuery.data?.members ?? []).map((member) => [
        member.user.id,
        member.user.name || member.user.email || member.user.id,
      ])
    )
  }, [membersQuery.data?.members])
  const events = activityQuery.data?.pages.flatMap((page) => page.events) ?? []
  const projectNameById = useMemo(() => {
    return new Map(
      (projectsQuery.data?.projects ?? []).map((projectRecord) => [
        projectRecord.project.id,
        projectRecord.project.name,
      ])
    )
  }, [projectsQuery.data?.projects])
  const projectIdsNeedingSecretFallback = useMemo(() => {
    return [
      ...new Set(
        events
          .filter(
            (event) =>
              Boolean(activityProjectId(event)) &&
              Boolean(activitySecretId(event)) &&
              !stringMetadata(event.metadata, 'secretName')
          )
          .map((event) => activityProjectId(event))
          .filter((value): value is string => Boolean(value))
      ),
    ]
  }, [events])
  const secretQueries = useQueries({
    queries: projectIdsNeedingSecretFallback.map((projectId) => ({
      queryKey: ['activity-secret-fallback', projectId],
      queryFn: async () => {
        const [projectSecrets, personalSecrets] = await Promise.all([
          secretsApi.listProjectSecrets(projectId).then((response) => response.secrets),
          secretsApi.listPersonalSecrets(projectId).then((response) => response.secrets),
        ])

        return [...projectSecrets, ...personalSecrets]
      },
      staleTime: 60_000,
    })),
  })
  const secretDetailsByProjectAndSecretId = useMemo(() => {
    const lookup = new Map<string, { name: string; environment: string }>()

    for (const [index, projectId] of projectIdsNeedingSecretFallback.entries()) {
      const secrets = secretQueries[index]?.data ?? []
      for (const secret of secrets) {
        lookup.set(`${projectId}:${secret.id}`, {
          name: secret.name,
          environment: secret.environment,
        })
      }
    }

    return lookup
  }, [projectIdsNeedingSecretFallback, secretQueries])

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node || !activityQuery.hasNextPage) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !activityQuery.isFetchingNextPage) {
          void activityQuery.fetchNextPage()
        }
      },
      { rootMargin: '320px 0px' }
    )
    observer.observe(node)

    return () => observer.disconnect()
  }, [activityQuery.fetchNextPage, activityQuery.hasNextPage, activityQuery.isFetchingNextPage])

  useEffect(() => {
    if (
      !highlightedEventId ||
      events.some((event) => event.id === highlightedEventId) ||
      !activityQuery.hasNextPage ||
      activityQuery.isFetchingNextPage
    ) {
      return
    }

    void activityQuery.fetchNextPage()
  }, [
    activityQuery.fetchNextPage,
    activityQuery.hasNextPage,
    activityQuery.isFetchingNextPage,
    events,
    highlightedEventId,
  ])

  useEffect(() => {
    if (!highlightedEventId) {
      didScrollToHighlightedRef.current = false
      return
    }

    const highlighted = events.find((event) => event.id === highlightedEventId)
    if (!highlighted || didScrollToHighlightedRef.current) {
      return
    }

    const node = document.getElementById(activityAnchorId(highlighted.id))
    if (!node) {
      return
    }

    didScrollToHighlightedRef.current = true
    node.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [events, highlightedEventId])

  return (
    <TooltipProvider>
      <PageWrapper className="px-3 sm:px-4 lg:px-5">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-accent" />
            <h1 className="text-3xl font-semibold tracking-normal">Activity</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Significant organisation changes across members, projects, tokens, and secrets.
          </p>
        </div>

        {activityQuery.isError ? (
          <ErrorState
            title="Unable to load activity"
            message={getApiFriendlyMessage(
              activityQuery.error,
              'Unable to load organisation activity right now.'
            )}
            onRetry={() => void activityQuery.refetch()}
          />
        ) : activityQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading activity...
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Project, token, membership, and secret changes will appear here."
          />
        ) : (
          <div className="relative w-full">
            <div className="absolute top-4 bottom-0 left-[0.625rem] w-px bg-border" />
            <div className="space-y-10">
              {groupEvents(events).map(([label, group]) => (
                <section className="relative" key={label}>
                  <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-6">
                    <div className="flex justify-center">
                      <span className="relative z-10 h-4 w-4 rounded-full border-2 border-background bg-accent" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground-soft">{label}</h2>
                  </div>

                  <div className="mt-5 space-y-8">
                    {group.map((event) => (
                      <ActivityItem
                        event={event}
                        isHighlighted={event.id === highlightedEventId}
                        key={event.id}
                        memberNames={memberNames}
                        projectNameById={projectNameById}
                        secretDetailsByProjectAndSecretId={secretDetailsByProjectAndSecretId}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="h-10" ref={loadMoreRef} />
            {activityQuery.isFetchingNextPage ? (
              <div className="flex items-center gap-2 pl-11 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more activity...
              </div>
            ) : null}
          </div>
        )}
      </PageWrapper>
    </TooltipProvider>
  )
}

function ActivityItem({
  event,
  memberNames,
  isHighlighted,
  projectNameById,
  secretDetailsByProjectAndSecretId,
}: {
  event: AuditEvent
  memberNames: Map<string, string>
  isHighlighted: boolean
  projectNameById: Map<string, string>
  secretDetailsByProjectAndSecretId: Map<string, { name: string; environment: string }>
}) {
  const resolvedProjectId = activityProjectId(event)
  const resolvedSecretId = activitySecretId(event)
  const fallbackProjectName =
    (resolvedProjectId ? projectNameById.get(resolvedProjectId) : null) ?? null
  const fallbackSecretDetails =
    resolvedProjectId && resolvedSecretId
      ? (secretDetailsByProjectAndSecretId.get(`${resolvedProjectId}:${resolvedSecretId}`) ?? null)
      : null
  const fallbackSecretName = fallbackSecretDetails?.name ?? null
  const fallbackEnvironment =
    stringMetadata(event.metadata, 'environment') ?? fallbackSecretDetails?.environment ?? null
  const linkedProjectName =
    stringMetadata(event.metadata, 'projectName') ?? fallbackProjectName ?? null
  const projectHref = resolvedProjectId ? `/projects/${resolvedProjectId}` : null
  const summary = describeOrganizationEvent(event, memberNames, {
    environment: fallbackEnvironment,
    projectName: fallbackProjectName,
    secretName: fallbackSecretName,
  })

  async function handleCopyLink() {
    const link = activityPermalink(event.id)
    const copied = await copyToClipboard(link)

    if (!copied) {
      toast.error('Clipboard access is not available in this browser context.')
      return
    }

    toast.success('Activity link copied.')
  }

  return (
    <article
      className={cn(
        'grid grid-cols-[1.25rem_3rem_minmax(0,1fr)] gap-4 rounded-lg px-2 py-2 transition-colors',
        isHighlighted && 'bg-warning-muted/40 ring-1 ring-warning/35'
      )}
      id={activityAnchorId(event.id)}
    >
      <div className="flex justify-center pt-5"></div>

      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center self-start rounded-full border border-accent/35 bg-accent/12 text-sm font-semibold text-accent">
        {initials(summary.actor)}
      </div>

      <div className="min-w-0 space-y-2">
        <div>
          <p className="text-sm font-semibold text-foreground-soft">{summary.actor}</p>
          <p className="mt-1 text-[1.05rem] text-foreground">
            {renderSentenceWithProjectLink(summary.sentence, linkedProjectName, projectHref)}
          </p>
        </div>

        {summary.change ? <ChangeStrip change={summary.change} /> : null}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          <span>{formatDateTime(event.occurredAt)}</span>
          {summary.context.map((item) => (
            <span key={item}>{item}</span>
          ))}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Copy URL"
                className="h-7 px-2 text-xs flex items-center gap-1"
                onClick={() => void handleCopyLink()}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Link2 className="h-3.5 w-3.5" />
                {event.id}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy URL</TooltipContent>
          </Tooltip>
          {event.outcome !== 'success' ? (
            <StatusBadge className="gap-1 py-0.5" tone={summary.tone}>
              <XCircle className="h-3 w-3" />
              Failed
            </StatusBadge>
          ) : null}
        </div>

        {event.failureReason ? (
          <p className="text-xs text-danger">
            {event.failureReason}
            {requestId(event) ? ` (ref: ${requestId(event)})` : ''}
          </p>
        ) : null}
      </div>
    </article>
  )
}

function ChangeStrip({
  change,
}: {
  change: { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; items: string[] }
}) {
  const visibleItems = change.items.slice(0, 3)
  const hasMoreItems = change.items.length > visibleItems.length

  return (
    <div className="grid overflow-hidden rounded-md border border-border bg-card sm:grid-cols-[12rem_1fr]">
      <div className="border-border border-b px-4 py-2 text-sm font-semibold text-muted-foreground sm:border-r sm:border-b-0">
        {change.label}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 px-3 py-2">
        {change.items.length > 0 ? (
          <>
            {visibleItems.map((item) => (
              <span
                className={cn(
                  'max-w-full truncate rounded-md px-2 py-0.5 font-mono text-sm',
                  change.tone === 'success'
                    ? 'bg-accent/18 text-accent'
                    : change.tone === 'danger'
                      ? 'bg-danger-muted text-danger'
                      : change.tone === 'warning'
                        ? 'bg-warning-muted text-warning'
                        : 'bg-background-elevated text-foreground-soft'
                )}
                key={item}
                title={item}
              >
                {item}
              </span>
            ))}
            {hasMoreItems ? <span className="text-sm text-muted-foreground">...</span> : null}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Details recorded</span>
        )}
      </div>
    </div>
  )
}

function renderSentenceWithProjectLink(
  sentence: string,
  projectName: string | null,
  projectHref: string | null
) {
  if (!projectName || !projectHref || !sentence.includes(projectName)) {
    return sentence
  }

  const [before, after] = sentence.split(projectName, 2)

  return (
    <>
      {before}
      <Link className="transition hover:underline" href={projectHref}>
        {projectName}
      </Link>
      {after}
    </>
  )
}

function groupEvents(events: AuditEvent[]) {
  const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
  const today = formatter.format(new Date())
  const yesterday = formatter.format(new Date(Date.now() - 24 * 60 * 60 * 1000))
  const groups = new Map<string, AuditEvent[]>()

  for (const event of events) {
    const formatted = formatter.format(new Date(event.occurredAt))
    const label = formatted === today ? 'Today' : formatted === yesterday ? 'Yesterday' : formatted
    groups.set(label, [...(groups.get(label) ?? []), event])
  }

  return Array.from(groups.entries())
}

function describeOrganizationEvent(
  event: AuditEvent,
  memberNames: Map<string, string>,
  fallbacks?: {
    environment?: string | null
    projectName?: string | null
    secretName?: string | null
  }
) {
  const actor = event.actorUserId
    ? (memberNames.get(event.actorUserId) ?? shortId(event.actorUserId))
    : 'System'
  const targetName =
    stringMetadata(event.metadata, 'targetName') ??
    stringMetadata(event.metadata, 'secretName') ??
    stringMetadata(event.metadata, 'projectName') ??
    stringMetadata(event.metadata, 'organizationName') ??
    stringMetadata(event.metadata, 'targetEmail') ??
    stringMetadata(event.metadata, 'tokenName')
  const organizationName = stringMetadata(event.metadata, 'organizationName')
  const previousOrganizationName = stringMetadata(event.metadata, 'previousOrganizationName')
  const projectName =
    stringMetadata(event.metadata, 'projectName') ?? fallbacks?.projectName ?? 'project'
  const secretName = stringMetadata(event.metadata, 'secretName') ?? fallbacks?.secretName ?? null
  const environment =
    stringMetadata(event.metadata, 'environment') ?? fallbacks?.environment ?? null
  const role = stringMetadata(event.metadata, 'role')
  const previousRole = stringMetadata(event.metadata, 'previousRole')
  const changedFields = listMetadata(event.metadata, 'changedFields')
  const importedSecretNames = listMetadata(event.metadata, 'importedSecretNames')
  const updatedSecretNames = listMetadata(event.metadata, 'updatedSecretNames')
  const context = eventContext(event, environment)

  if (event.eventType === 'auth.organization.created') {
    return {
      actor,
      sentence: `Created ${organizationName ?? targetName ?? 'an organisation'}.`,
      tone: 'success' as const,
      context,
      change: null,
    }
  }

  if (event.eventType === 'auth.organization.updated') {
    if (changedFields.includes('name') && organizationName) {
      return {
        actor,
        sentence: previousOrganizationName
          ? `Renamed ${previousOrganizationName} to ${organizationName}.`
          : `Renamed the organisation to ${organizationName}.`,
        tone: 'warning' as const,
        context,
        change:
          changedFields.length > 1
            ? {
                label: 'Also changed',
                tone: 'warning' as const,
                items: changedFields.filter((field) => field !== 'name'),
              }
            : null,
      }
    }

    return {
      actor,
      sentence: `Updated ${organizationName ?? 'organisation'} settings.`,
      tone: 'warning' as const,
      context,
      change: changedFields.length
        ? { label: 'Changed', tone: 'warning' as const, items: changedFields }
        : null,
    }
  }

  if (event.eventType === 'auth.organization.member.updated') {
    if (role === 'owner' && previousRole && previousRole !== 'owner') {
      return {
        actor,
        sentence: `Transferred organisation ownership to ${targetName ?? 'a member'}.`,
        tone: 'warning' as const,
        context,
        change: {
          label: 'Role',
          tone: 'warning' as const,
          items: [`${previousRole} -> ${role}`],
        },
      }
    }

    return {
      actor,
      sentence: `Updated ${targetName ?? 'a member'} in the organisation.`,
      tone: 'warning' as const,
      context,
      change:
        role || previousRole
          ? {
              label: 'Role',
              tone: 'warning' as const,
              items:
                previousRole && role && previousRole !== role
                  ? [`${previousRole} -> ${role}`]
                  : [role ?? previousRole ?? 'updated'],
            }
          : null,
    }
  }

  if (event.eventType === 'auth.organization.member.added') {
    return {
      actor,
      sentence:
        event.actorUserId && event.actorUserId === stringMetadata(event.metadata, 'targetUserId')
          ? `Joined ${organizationName ?? 'the organisation'}.`
          : `Added ${targetName ?? 'a member'} to the organisation.`,
      tone: 'success' as const,
      context,
      change: role ? { label: 'Role', tone: 'neutral' as const, items: [role] } : null,
    }
  }

  if (event.eventType === 'auth.organization.member.removed') {
    return {
      actor,
      sentence: `Removed ${targetName ?? 'a member'} from the organisation.`,
      tone: 'danger' as const,
      context,
      change: previousRole
        ? { label: 'Removed role', tone: 'danger' as const, items: [previousRole] }
        : null,
    }
  }

  if (event.eventType === 'auth.organization.invitation.created') {
    return {
      actor,
      sentence: `Invited ${targetName ?? 'a member'} to the organisation.`,
      tone: 'success' as const,
      context,
      change: stringMetadata(event.metadata, 'targetRole')
        ? {
            label: 'Role',
            tone: 'neutral' as const,
            items: [stringMetadata(event.metadata, 'targetRole') ?? 'member'],
          }
        : null,
    }
  }

  if (event.eventType === 'auth.organization.invitation.accepted') {
    return {
      actor,
      sentence: `Joined ${organizationName ?? 'the organisation'}.`,
      tone: 'success' as const,
      context,
      change: stringMetadata(event.metadata, 'targetRole')
        ? {
            label: 'Role',
            tone: 'neutral' as const,
            items: [stringMetadata(event.metadata, 'targetRole') ?? 'member'],
          }
        : null,
    }
  }

  if (event.eventType === 'auth.organization.invitation.revoked') {
    return {
      actor,
      sentence: `Revoked the invitation for ${targetName ?? 'a member'}.`,
      tone: 'danger' as const,
      context,
      change: null,
    }
  }

  if (event.eventType === 'auth.organization.invitation.rejected') {
    return {
      actor,
      sentence: `${targetName ?? 'An invitee'} rejected the invitation.`,
      tone: 'danger' as const,
      context,
      change: null,
    }
  }

  if (event.eventType === 'projects.created') {
    return {
      actor,
      sentence: `Created ${targetName ?? 'a project'}.`,
      tone: 'success' as const,
      context,
      change: null,
    }
  }

  if (event.eventType === 'projects.deleted') {
    return {
      actor,
      sentence: `Deleted ${targetName ?? 'a project'}.`,
      tone: 'danger' as const,
      context,
      change: null,
    }
  }

  if (event.eventType === 'projects.updated') {
    const previousProjectName = stringMetadata(event.metadata, 'previousProjectName')
    const status = stringMetadata(event.metadata, 'status')
    const previousStatus = stringMetadata(event.metadata, 'previousStatus')
    const projectLabel = targetName ?? 'a project'

    // A status change is the most common non-rename update — describe the exact
    // transition instead of a vague "Updated a project".
    if (changedFields.includes('status') && status && status !== previousStatus) {
      const statusSentence =
        status === 'archived'
          ? `Archived ${projectLabel}.`
          : status === 'active' && previousStatus === 'archived'
            ? `Restored ${projectLabel} from the archive.`
            : `Changed ${projectLabel} status to ${status}.`
      return {
        actor,
        sentence: statusSentence,
        tone: status === 'archived' ? ('warning' as const) : ('success' as const),
        context,
        change:
          previousStatus && status
            ? {
                label: 'Status',
                tone: 'neutral' as const,
                items: [`${previousStatus} → ${status}`],
              }
            : null,
      }
    }

    if (changedFields.includes('name') && previousProjectName && targetName) {
      return {
        actor,
        sentence: `Renamed ${previousProjectName} to ${targetName}.`,
        tone: 'warning' as const,
        context,
        change: {
          label: 'Name',
          tone: 'neutral' as const,
          items: [`${previousProjectName} → ${targetName}`],
        },
      }
    }

    return {
      actor,
      sentence: changedFields.length
        ? `Updated ${projectLabel} (${changedFields.join(', ')}).`
        : `Updated ${projectLabel}.`,
      tone: 'warning' as const,
      context,
      change: changedFields.length
        ? { label: 'Changed', tone: 'warning' as const, items: changedFields }
        : null,
    }
  }

  if (event.eventType === 'projects.members.added') {
    return {
      actor,
      sentence: `Added ${targetName ?? 'a member'} to ${projectName}.`,
      tone: 'success' as const,
      context,
      change: role ? { label: 'Role', tone: 'neutral' as const, items: [role] } : null,
    }
  }

  if (event.eventType === 'projects.members.updated') {
    return {
      actor,
      sentence: `Updated ${targetName ?? 'a project member'} in ${projectName}.`,
      tone: 'warning' as const,
      context,
      change:
        role || previousRole
          ? {
              label: 'Role',
              tone: 'warning' as const,
              items:
                previousRole && role && previousRole !== role
                  ? [`${previousRole} -> ${role}`]
                  : [role ?? previousRole ?? 'updated'],
            }
          : null,
    }
  }

  if (event.eventType === 'projects.members.removed') {
    return {
      actor,
      sentence: `Removed ${targetName ?? 'a project member'} from ${projectName}.`,
      tone: 'danger' as const,
      context,
      change: previousRole
        ? { label: 'Removed role', tone: 'danger' as const, items: [previousRole] }
        : null,
    }
  }

  if (event.eventType === 'secrets.imported') {
    const importedCount = numberMetadata(event.metadata, 'importedCount')
    const updatedCount = numberMetadata(event.metadata, 'updatedCount')
    const changeItems = [
      ...importedSecretNames,
      ...updatedSecretNames.filter((name) => !importedSecretNames.includes(name)),
    ]
    const changeLabel =
      importedCount > 0 && updatedCount === 0
        ? 'Added'
        : updatedCount > 0 && importedCount === 0
          ? 'Updated'
          : 'Changed'

    return {
      actor,
      sentence: `Modified secrets${environment ? ` in ${environment}` : ''} of ${projectName}.`,
      tone: 'success' as const,
      context,
      change: {
        label: changeLabel,
        tone: 'success' as const,
        items:
          changeItems.length > 0
            ? changeItems
            : [`${importedCount} added`, `${updatedCount} updated`].filter(
                (item) => !item.startsWith('0 ')
              ),
      },
    }
  }

  if (event.eventType === 'secrets.created') {
    return {
      actor,
      sentence: `Added ${secretName ?? 'a secret'}${environment ? ` in ${environment}` : ''} of ${projectName}.`,
      tone: 'success' as const,
      context,
      change: secretName ? { label: 'Added', tone: 'success' as const, items: [secretName] } : null,
    }
  }

  if (event.eventType === 'secrets.updated') {
    return {
      actor,
      sentence: `Updated ${secretName ?? 'a secret'}${environment ? ` in ${environment}` : ''} of ${projectName}.`,
      tone: 'warning' as const,
      context,
      change: secretName
        ? { label: 'Updated', tone: 'warning' as const, items: [secretName] }
        : null,
    }
  }

  if (event.eventType === 'secrets.deleted') {
    return {
      actor,
      sentence: `Deleted ${secretName ?? 'a secret'}${environment ? ` in ${environment}` : ''} of ${projectName}.`,
      tone: 'danger' as const,
      context,
      change: secretName
        ? { label: 'Deleted', tone: 'danger' as const, items: [secretName] }
        : null,
    }
  }

  if (event.eventType === 'secrets.version_restored') {
    return {
      actor,
      sentence: `Restored ${secretName ?? 'a secret'}${environment ? ` in ${environment}` : ''} of ${projectName}.`,
      tone: 'warning' as const,
      context,
      change: secretName
        ? { label: 'Restored', tone: 'warning' as const, items: [secretName] }
        : null,
    }
  }

  if (event.eventType.startsWith('secrets.')) {
    const action = event.eventType.replace('secrets.', '').replaceAll('_', ' ')
    return {
      actor,
      sentence: `${sentenceCase(action)} ${targetName ?? 'a secret'} in ${projectName}.`,
      tone: action.includes('deleted') ? ('danger' as const) : ('warning' as const),
      context,
      change: targetName
        ? { label: sentenceCase(action), tone: 'warning' as const, items: [targetName] }
        : null,
    }
  }

  return {
    actor,
    sentence: `${sentenceCase(event.eventType.replaceAll('.', ' '))}.`,
    tone: event.outcome === 'success' ? ('neutral' as const) : ('danger' as const),
    context,
    change: null,
  }
}

function eventContext(event: AuditEvent, fallbackEnvironment?: string | null) {
  const context = [] as string[]
  const environment = stringMetadata(event.metadata, 'environment') ?? fallbackEnvironment ?? null
  const role = stringMetadata(event.metadata, 'role')

  if (environment) {
    context.push(environment)
  }

  if (event.eventType.includes('member') && role) {
    context.push(role)
  }

  return context
}

function activityProjectId(event: AuditEvent) {
  return (
    event.projectId ??
    stringMetadata(event.metadata, 'projectId') ??
    routeSegment(event.route, 'projects')
  )
}

function activitySecretId(event: AuditEvent) {
  return (
    event.secretId ??
    stringMetadata(event.metadata, 'secretId') ??
    routeSegment(event.route, 'secrets')
  )
}

function routeSegment(route: string | null, segment: string) {
  if (!route) {
    return null
  }

  const parts = route.split('/').filter(Boolean)
  const segmentIndex = parts.indexOf(segment)
  if (segmentIndex === -1 || segmentIndex === parts.length - 1) {
    return null
  }

  return parts[segmentIndex + 1] ?? null
}

function activityPermalink(eventId: string) {
  const url = new URL('/activity', window.location.origin)
  url.searchParams.set('event', eventId)
  return url.toString()
}

function activityAnchorId(eventId: string) {
  return `activity-${eventId}`
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).slice(0, 2)
  return (parts.map((part) => part[0]).join('') || 'PV').toUpperCase()
}

function requestId(event: AuditEvent) {
  return stringMetadata(event.metadata, 'requestId') ?? shortId(event.id)
}

function stringMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function numberMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'number' ? value : 0
}

function listMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function shortId(value: string) {
  return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value
}
