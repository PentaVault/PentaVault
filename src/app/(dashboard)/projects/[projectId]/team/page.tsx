'use client'

import { useParams } from 'next/navigation'
import { useMemo } from 'react'

import { TeamMemberAddForm } from '@/components/dashboard/team-member-add-form'
import { TeamMemberRow } from '@/components/dashboard/team-member-row'
import { ProjectAccessRequiredState } from '@/components/projects/project-access-required-state'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/use-auth'
import {
  useProject,
  useProjectAccessRequests,
  useReviewProjectAccessRequest,
} from '@/lib/hooks/use-projects'
import { useProjectMembers } from '@/lib/hooks/use-team'
import { useToast } from '@/lib/hooks/use-toast'
import { useProjectTokens } from '@/lib/hooks/use-tokens'
import type { AccessRequest } from '@/lib/types/models'
import { getApiErrorCode, getApiFriendlyMessage } from '@/lib/utils/errors'

export default function ProjectTeamPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null
  const auth = useAuth()
  const projectQuery = useProject(projectId)
  const canAccessProject = projectQuery.data?.canAccess ?? false
  const effectiveRole = projectQuery.data?.effectiveRole ?? projectQuery.data?.orgRole ?? null
  const canReadMembers =
    canAccessProject || effectiveRole === 'auditor' || effectiveRole === 'readonly'
  const membersQuery = useProjectMembers(projectId, canReadMembers)
  const tokensQuery = useProjectTokens(projectId, canReadMembers)
  const reviewRequest = useReviewProjectAccessRequest(projectId)
  const { toast } = useToast()

  const projectName = projectQuery.data?.project.name ?? 'Project'
  const canManageMembers = effectiveRole === 'owner' || effectiveRole === 'admin'
  const requestsQuery = useProjectAccessRequests(projectId, 'pending', canManageMembers)
  const members = useMemo(() => membersQuery.data?.members ?? [], [membersQuery.data?.members])
  const pendingRequests = useMemo(
    () => requestsQuery.data?.requests ?? [],
    [requestsQuery.data?.requests]
  )
  const tokens = tokensQuery.data ?? []
  const currentUserId = auth.session?.user.id ?? null
  const orderedMembers = useMemo(() => {
    if (!currentUserId) {
      return members
    }

    return [...members].sort((left, right) => {
      if (left.userId === currentUserId) return -1
      if (right.userId === currentUserId) return 1
      return left.createdAt.localeCompare(right.createdAt)
    })
  }, [currentUserId, members])
  const existingUserIds = useMemo(() => new Set(members.map((member) => member.userId)), [members])
  const organizationId = projectQuery.data?.project.organizationId ?? null

  async function reviewAccessRequest(
    request: AccessRequest,
    status: 'approved' | 'rejected'
  ): Promise<void> {
    try {
      await reviewRequest.mutateAsync({
        requestId: request.id,
        input: {
          status,
          ...(status === 'approved'
            ? { grantedRole: request.requestedRole }
            : { reviewerNote: 'Declined from project team review.' }),
        },
      })
      toast.success(status === 'approved' ? 'Access request approved.' : 'Access request declined.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to review access request right now.'))
    }
  }

  if (!projectId) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold">Team & Access</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Project context is required to manage members.
          </p>
        </div>
      </div>
    )
  }

  if (projectQuery.isError && getApiErrorCode(projectQuery.error) === 'PROJECT_ACCESS_REQUIRED') {
    return (
      <div className="p-6">
        <ProjectAccessRequiredState
          description="You need project access before you can view tokens and pending requests."
          projectId={projectId}
          title="Access required"
        />
      </div>
    )
  }

  if (projectQuery.isError && !projectQuery.data) {
    return (
      <div className="p-6">
        <ErrorState
          title="Project unavailable"
          message={getApiFriendlyMessage(
            projectQuery.error,
            'The project could not be loaded. It may not exist or you may not have access.'
          )}
          onRetry={() => void projectQuery.refetch()}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h2 className="text-lg font-semibold">Team & Access</h2>
          <p className="text-sm text-muted-foreground">
            Manage team access for {projectName}. Owner role is immutable by design.
          </p>
        </div>
      </div>

      {canManageMembers ? (
        <div className="mb-6 rounded-lg border border-border p-4">
          <p className="mb-3 text-sm font-medium">Add member</p>
          <TeamMemberAddForm
            existingUserIds={existingUserIds}
            organizationId={organizationId}
            projectId={projectId}
          />
        </div>
      ) : null}

      {canManageMembers ? (
        <div className="mb-6 overflow-hidden rounded-lg border border-border">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium">Pending access requests</p>
          </div>

          {requestsQuery.isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading requests...</p>
          ) : requestsQuery.isError ? (
            <div className="p-4">
              <ErrorState
                title="Unable to load access requests"
                message={getApiFriendlyMessage(
                  requestsQuery.error,
                  'Please try again in a moment.'
                )}
                onRetry={() => void requestsQuery.refetch()}
              />
            </div>
          ) : pendingRequests.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No pending access requests.</p>
          ) : (
            pendingRequests.map((request) => (
              <AccessRequestRow
                isPending={reviewRequest.isPending}
                key={request.id}
                onReview={(status) => void reviewAccessRequest(request, status)}
                request={request}
              />
            ))
          )}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        {membersQuery.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading members...</p>
        ) : membersQuery.isError ? (
          <div className="p-4">
            <ErrorState
              title="Unable to load team members"
              message={getApiFriendlyMessage(membersQuery.error, 'Please try again in a moment.')}
              onRetry={() => void membersQuery.refetch()}
            />
          </div>
        ) : orderedMembers.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No team members yet"
              description="Add the first collaborator to start sharing access to this project."
            />
          </div>
        ) : (
          orderedMembers.map((membership) => (
            <TeamMemberRow
              assignedCount={tokens.filter((token) => token.userId === membership.userId).length}
              canManage={canManageMembers}
              currentUserId={currentUserId}
              key={membership.id}
              membership={membership}
              projectId={projectId}
            />
          ))
        )}
      </div>
    </div>
  )
}

function AccessRequestRow({
  isPending,
  onReview,
  request,
}: {
  isPending: boolean
  onReview: (status: 'approved' | 'rejected') => void
  request: AccessRequest
}) {
  const requesterLabel = request.requester?.name ?? request.requester?.email ?? request.requesterId
  const requesterMeta =
    request.requester?.email ?? request.requester?.username ?? request.requesterId

  return (
    <div className="grid gap-3 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_140px_180px] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{requesterLabel}</p>
        <p className="truncate text-xs text-muted-foreground">{requesterMeta}</p>
        {request.message ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{request.message}</p>
        ) : null}
      </div>

      <StatusBadge className="justify-self-start capitalize md:justify-self-center" tone="neutral">
        {request.requestedRole}
      </StatusBadge>

      <div className="flex justify-start gap-2 md:justify-end">
        <Button
          disabled={isPending}
          onClick={() => onReview('rejected')}
          size="sm"
          type="button"
          variant="outline"
        >
          Decline
        </Button>
        <Button disabled={isPending} onClick={() => onReview('approved')} size="sm" type="button">
          Approve
        </Button>
      </div>
    </div>
  )
}
