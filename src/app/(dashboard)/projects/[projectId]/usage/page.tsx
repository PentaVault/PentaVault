'use client'

import { useParams } from 'next/navigation'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { ProjectAccessRequiredState } from '@/components/projects/project-access-required-state'
import { ErrorState } from '@/components/shared/error-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProject } from '@/lib/hooks/use-projects'
import { getApiErrorCode, getApiFriendlyMessage } from '@/lib/utils/errors'

export default function ProjectUsagePage() {
  const params = useParams<{ projectId: string }>()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null
  const projectQuery = useProject(projectId)

  const projectName = projectQuery.data?.project.name ?? 'Project'

  if (
    projectId &&
    projectQuery.isError &&
    getApiErrorCode(projectQuery.error) === 'PROJECT_ACCESS_REQUIRED'
  ) {
    return (
      <PageWrapper>
        <ProjectAccessRequiredState
          description="You need project access before you can view this project's usage area."
          projectId={projectId}
          title="Access required"
        />
      </PageWrapper>
    )
  }

  if (projectQuery.isError && !projectQuery.data) {
    return (
      <PageWrapper>
        <ErrorState
          title="Project unavailable"
          message={getApiFriendlyMessage(
            projectQuery.error,
            'The project could not be loaded. It may not exist or you may not have access.'
          )}
          onRetry={() => void projectQuery.refetch()}
        />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            Usage remains unavailable for {projectName}. Backend usage endpoint is not implemented
            yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This page intentionally indicates backend capability status to avoid misleading analytics
          behavior.
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
