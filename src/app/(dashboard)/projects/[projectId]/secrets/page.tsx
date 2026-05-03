'use client'

import { Plus, Search } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ProjectAccessRequiredState } from '@/components/projects/project-access-required-state'
import { AddSecretDialog } from '@/components/secrets/add-secret-dialog'
import { SecretsList } from '@/components/secrets/secrets-list'
import { ErrorState } from '@/components/shared/error-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjectEnvironments } from '@/lib/hooks/use-project-configuration'
import { useProject } from '@/lib/hooks/use-projects'
import { getApiErrorCode, getApiFriendlyMessage } from '@/lib/utils/errors'

export default function ProjectSecretsPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null
  const projectQuery = useProject(projectId)
  const environmentsQuery = useProjectEnvironments(projectId, Boolean(projectId))
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | null>(null)

  const environments = environmentsQuery.data?.environments ?? []
  const canAccessProject = projectQuery.data?.canAccess ?? false
  const effectiveRole = projectQuery.data?.effectiveRole ?? projectQuery.data?.orgRole ?? null
  const canManageSecrets = effectiveRole === 'owner' || effectiveRole === 'admin'
  const developmentEnvironment =
    environments.find((environment) => environment.slug === 'development') ?? null
  const selectedEnvironment =
    (canManageSecrets
      ? environments.find((environment) => environment.id === selectedEnvironmentId)
      : developmentEnvironment) ??
    environments.find((environment) => environment.isDefault) ??
    environments[0] ??
    null

  useEffect(() => {
    if (canManageSecrets && !selectedEnvironmentId && selectedEnvironment?.id) {
      setSelectedEnvironmentId(selectedEnvironment.id)
    }
  }, [canManageSecrets, selectedEnvironment?.id, selectedEnvironmentId])

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

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 shrink-0">
          <h2 className="text-lg font-semibold">Environment Variables</h2>
          <p className="text-sm text-muted-foreground">
            Store and manage your project secrets securely.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 xl:w-auto xl:flex-nowrap">
          <div className="relative min-w-64 flex-1 xl:w-[min(28rem,34vw)] xl:flex-none">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search variables..."
              value={search}
            />
          </div>
          {canManageSecrets && environments.length > 0 ? (
            <Select
              onValueChange={(value) => setSelectedEnvironmentId(value)}
              value={selectedEnvironment?.id ?? ''}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Environment" />
              </SelectTrigger>
              <SelectContent align="end">
                {environments.map((environment) => (
                  <SelectItem key={environment.id} value={environment.id}>
                    {environment.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {canAccessProject ? (
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
        environmentId={selectedEnvironment?.id ?? null}
        environmentSlug={selectedEnvironment?.slug ?? 'development'}
        projectId={projectId}
        search={search}
      />

      {canAccessProject ? (
        <AddSecretDialog
          allowProjectScope={canManageSecrets}
          environmentId={selectedEnvironment?.id ?? null}
          environmentSlug={selectedEnvironment?.slug ?? 'development'}
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          projectId={projectId}
        />
      ) : null}
    </div>
  )
}
