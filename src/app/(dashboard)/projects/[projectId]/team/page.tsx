'use client'

import { useParams } from 'next/navigation'
import { useMemo } from 'react'

import { TeamMemberAddForm } from '@/components/dashboard/team-member-add-form'
import { TeamMemberRow } from '@/components/dashboard/team-member-row'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { useProject } from '@/lib/hooks/use-projects'
import { useProjectMembers } from '@/lib/hooks/use-team'
import { useProjectTokens } from '@/lib/hooks/use-tokens'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

export default function ProjectTeamPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null
  const projectQuery = useProject(projectId)
  const membersQuery = useProjectMembers(projectId)
  const tokensQuery = useProjectTokens(projectId)

  const projectName = projectQuery.data?.project.name ?? 'Project'
  const members = useMemo(() => membersQuery.data?.members ?? [], [membersQuery.data?.members])
  const tokens = tokensQuery.data ?? []
  const existingUserIds = useMemo(() => new Set(members.map((member) => member.userId)), [members])
  const organizationId = projectQuery.data?.project.organizationId ?? null

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

      <div className="mb-6 rounded-lg border border-border p-4">
        <p className="mb-3 text-sm font-medium">Add member</p>
        <TeamMemberAddForm
          existingUserIds={existingUserIds}
          organizationId={organizationId}
          projectId={projectId}
        />
      </div>

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
        ) : members.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No team members yet"
              description="Add the first collaborator to start sharing access to this project."
            />
          </div>
        ) : (
          members.map((membership) => (
            <TeamMemberRow
              assignedCount={tokens.filter((token) => token.userId === membership.userId).length}
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
