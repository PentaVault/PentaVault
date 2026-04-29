'use client'

import { useParams } from 'next/navigation'

import { ProjectAccessRequiredState } from '@/components/projects/project-access-required-state'
import { ErrorState } from '@/components/shared/error-state'
import { Button } from '@/components/ui/button'
import { Switch, SwitchThumb } from '@/components/ui/switch'
import { useProject, useUpdateProject } from '@/lib/hooks/use-projects'
import { useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils/cn'
import { getApiErrorCode, getApiFriendlyMessage } from '@/lib/utils/errors'

export default function ProjectSettingsPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null
  const projectQuery = useProject(projectId)
  const updateProject = useUpdateProject()
  const { toast } = useToast()
  const project = projectQuery.data?.project
  const effectiveRole = projectQuery.data?.effectiveRole ?? projectQuery.data?.orgRole ?? null
  const canManageSettings = effectiveRole === 'owner' || effectiveRole === 'admin'

  async function updateShowAllVariables(value: boolean): Promise<void> {
    if (!projectId) {
      return
    }

    try {
      await updateProject.mutateAsync({
        projectId,
        input: {
          showAllVariablesToMembers: value,
        },
      })
      toast.success('Project setting updated.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update this project setting right now.'))
    }
  }

  if (!projectId) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold">Project settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Project context is required to manage settings.
          </p>
        </div>
      </div>
    )
  }

  if (projectQuery.isError && getApiErrorCode(projectQuery.error) === 'PROJECT_ACCESS_REQUIRED') {
    return (
      <div className="p-6">
        <ProjectAccessRequiredState
          description="You need project access before you can view or update this project's settings."
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
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Project settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage access behavior for {project?.name ?? 'this project'}.
        </p>
      </div>

      <div className="rounded-lg border border-border">
        {canManageSettings ? (
          <div className="flex items-center justify-between gap-6 border-b border-border px-4 py-4">
            <div>
              <p className="text-sm font-medium">Show all variables to members</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                When enabled, members can see variable names and request access. When disabled,
                members only see variables already assigned to them.
              </p>
            </div>
            <Switch
              checked={project?.showAllVariablesToMembers ?? true}
              className={cn(
                'relative h-5 w-9 rounded-full border border-border bg-background-elevated transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent/35',
                updateProject.isPending && 'opacity-60'
              )}
              disabled={!project || updateProject.isPending}
              onCheckedChange={(value) => void updateShowAllVariables(value)}
            >
              <SwitchThumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-foreground transition-transform data-[state=checked]:translate-x-4" />
            </Switch>
          </div>
        ) : null}

        <div className="px-4 py-4">
          <p className="mb-2 font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
            Project URL
          </p>
          <p className="font-mono text-sm text-foreground">/{project?.slug ?? 'loading'}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Project URLs are generated automatically and cannot be edited.
          </p>
        </div>
      </div>

      {canManageSettings ? (
        <div className="mt-6 rounded-lg border border-danger/35 p-4">
          <p className="text-sm font-medium text-danger">Delete project</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Permanent project deletion is available from the project list actions menu.
          </p>
          <Button className="mt-3" disabled size="sm" type="button" variant="danger">
            Delete from project list
          </Button>
        </div>
      ) : null}
    </div>
  )
}
