'use client'

import { useParams } from 'next/navigation'

import { TokenAssignmentView } from '@/components/dashboard/token-assignment-view'
import { ProjectAccessRequiredState } from '@/components/projects/project-access-required-state'
import { ErrorState } from '@/components/shared/error-state'
import { StatusBadge } from '@/components/ui/badge'
import { useProject } from '@/lib/hooks/use-projects'
import type { ProjectRole, ProjectStatus } from '@/lib/types/models'
import { getApiErrorCode, getApiFriendlyMessage } from '@/lib/utils/errors'

function roleTone(role: ProjectRole | string) {
  return role === 'owner' ? 'warning' : role === 'admin' ? 'success' : 'neutral'
}

function statusTone(status: ProjectStatus) {
  return status === 'active' ? 'success' : 'warning'
}

export default function ProjectOverviewPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null
  const projectQuery = useProject(projectId)

  if (projectQuery.isLoading) {
    return (
      <div className="space-y-5 p-6">
        <div className="h-12 w-72 animate-pulse rounded-md bg-card" />
        <div className="h-40 animate-pulse rounded-lg border border-border bg-card" />
      </div>
    )
  }

  if (projectQuery.isError || !projectQuery.data) {
    if (getApiErrorCode(projectQuery.error) === 'PROJECT_ACCESS_REQUIRED' && projectId) {
      return (
        <div className="p-6">
          <ProjectAccessRequiredState projectId={projectId} />
        </div>
      )
    }

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

  const { project, membership, orgRole } = projectQuery.data
  const roleLabel = projectQuery.data.effectiveRole ?? membership?.role ?? orgRole

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{project.name}</h1>
          <p className="truncate font-mono text-sm text-muted-foreground">/{project.slug}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <StatusBadge tone={roleTone(roleLabel)}>{roleLabel}</StatusBadge>
          <StatusBadge className="capitalize" tone={statusTone(project.status)}>
            {project.status}
          </StatusBadge>
        </div>
      </div>

      <TokenAssignmentView projectId={project.id} />
    </div>
  )
}
