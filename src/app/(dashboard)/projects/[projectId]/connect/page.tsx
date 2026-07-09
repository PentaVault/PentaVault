'use client'

import { useParams } from 'next/navigation'

import { ConnectToolPanel } from '@/components/dashboard/connect-tool-panel'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { ProjectAccessRequiredState } from '@/components/projects/project-access-required-state'
import { ErrorState } from '@/components/shared/error-state'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProject } from '@/lib/hooks/use-projects'
import { getApiErrorCode, getApiFriendlyMessage } from '@/lib/utils/errors'

export default function ProjectConnectPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null
  const projectQuery = useProject(projectId)

  if (!projectId) {
    return (
      <PageWrapper>
        <Card>
          <CardHeader>
            <CardTitle>Connect</CardTitle>
            <CardDescription>Project context is required to connect a tool.</CardDescription>
          </CardHeader>
        </Card>
      </PageWrapper>
    )
  }

  if (projectQuery.isError && getApiErrorCode(projectQuery.error) === 'PROJECT_ACCESS_REQUIRED') {
    return (
      <PageWrapper>
        <ProjectAccessRequiredState
          description="You need project access before you can connect a tool to this project's gateway."
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
      <ConnectToolPanel projectId={projectId} />
    </PageWrapper>
  )
}
