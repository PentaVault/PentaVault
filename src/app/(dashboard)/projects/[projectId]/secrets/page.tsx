'use client'

import { Plus, Search } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useState } from 'react'

import { ProjectAccessRequiredState } from '@/components/projects/project-access-required-state'
import { AddSecretDialog } from '@/components/secrets/add-secret-dialog'
import { SecretsList } from '@/components/secrets/secrets-list'
import { ErrorState } from '@/components/shared/error-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProject } from '@/lib/hooks/use-projects'
import { getApiErrorCode, getApiFriendlyMessage } from '@/lib/utils/errors'

export default function ProjectSecretsPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null
  const projectQuery = useProject(projectId)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [search, setSearch] = useState('')

  if (!projectId) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold">Environment Variables</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Project context is required to manage secrets.
          </p>
        </div>
      </div>
    )
  }

  if (projectQuery.isError && getApiErrorCode(projectQuery.error) === 'PROJECT_ACCESS_REQUIRED') {
    return (
      <div className="p-6">
        <ProjectAccessRequiredState
          description="You need project access before you can view or manage this project's secrets."
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

  const canAccessProject = projectQuery.data?.canAccess ?? false
  const effectiveRole = projectQuery.data?.effectiveRole ?? projectQuery.data?.orgRole ?? null
  const canManageSecrets = effectiveRole === 'owner' || effectiveRole === 'admin'

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Environment Variables</h2>
          <p className="text-sm text-muted-foreground">
            Store and manage your project secrets securely.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <div className="relative w-[min(28rem,34vw)] min-w-64">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search variables..."
              value={search}
            />
          </div>
          {canManageSecrets ? (
            <Button onClick={() => setIsAddOpen(true)} type="button">
              <Plus className="mr-2 h-4 w-4" />
              Add variable
            </Button>
          ) : null}
        </div>
      </div>

      <SecretsList
        canManage={canManageSecrets}
        enabled={canAccessProject}
        projectId={projectId}
        search={search}
      />

      {canManageSecrets ? (
        <AddSecretDialog open={isAddOpen} onOpenChange={setIsAddOpen} projectId={projectId} />
      ) : null}
    </div>
  )
}
