'use client'

import { useParams } from 'next/navigation'

import { TeamMemberAddForm } from '@/components/dashboard/team-member-add-form'
import { TeamMemberRow } from '@/components/dashboard/team-member-row'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProject } from '@/lib/hooks/use-projects'
import { useProjectMembers } from '@/lib/hooks/use-team'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

export default function ProjectTeamPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null
  const projectQuery = useProject(projectId)
  const membersQuery = useProjectMembers(projectId)

  const projectName = projectQuery.data?.project.name ?? 'Project'

  if (!projectId) {
    return (
      <PageWrapper>
        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>Project context is required to manage members.</CardDescription>
          </CardHeader>
        </Card>
      </PageWrapper>
    )
  }

  const members = membersQuery.data?.members ?? []

  return (
    <PageWrapper>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Project members</CardTitle>
            <CardDescription>
              Manage team access for {projectName}. Owner role is immutable by design.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membersQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading members...</p>
            ) : membersQuery.isError ? (
              <ErrorState
                title="Unable to load team members"
                message={getApiFriendlyMessage(membersQuery.error, 'Please try again in a moment.')}
                onRetry={() => void membersQuery.refetch()}
              />
            ) : members.length === 0 ? (
              <EmptyState
                title="No team members yet"
                description="Add the first collaborator to start sharing access to this project."
              />
            ) : (
              <div className="space-y-3">
                {members.map((membership) => (
                  <TeamMemberRow
                    key={membership.id}
                    membership={membership}
                    projectId={projectId}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add member</CardTitle>
            <CardDescription>
              Add a project member by user ID with `admin` or `member` role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamMemberAddForm projectId={projectId} />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
