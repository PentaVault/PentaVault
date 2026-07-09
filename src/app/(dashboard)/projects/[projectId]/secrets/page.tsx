'use client'

import { GitBranch, Plus, Search, X } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ProjectAccessRequiredState } from '@/components/projects/project-access-required-state'
import { AddSecretDialog } from '@/components/secrets/add-secret-dialog'
import { SecretsList } from '@/components/secrets/secrets-list'
import { ErrorState } from '@/components/shared/error-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useCreateProjectConfig,
  useDeleteProjectConfig,
  useProjectConfigs,
  useProjectEnvironments,
} from '@/lib/hooks/use-project-configuration'
import { useProject } from '@/lib/hooks/use-projects'
import { getApiErrorCode, getApiFriendlyMessage } from '@/lib/utils/errors'

export default function ProjectSecretsPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null
  const projectQuery = useProject(projectId)
  const environmentsQuery = useProjectEnvironments(projectId, Boolean(projectId))
  const configsQuery = useProjectConfigs(projectId, Boolean(projectId))
  const createConfig = useCreateProjectConfig(projectId)
  const deleteConfig = useDeleteProjectConfig(projectId)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | null>(null)
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null)
  const [newBranchName, setNewBranchName] = useState('')

  const environments = environmentsQuery.data?.environments ?? []
  const configs = configsQuery.data?.configs ?? []
  const canAccessProject = projectQuery.data?.canAccess ?? false
  const effectiveRole = projectQuery.data?.effectiveRole ?? projectQuery.data?.orgRole ?? null
  const canManageSecrets = effectiveRole === 'owner' || effectiveRole === 'admin'
  const canCreateSecrets =
    canAccessProject &&
    (canManageSecrets || effectiveRole === 'developer' || effectiveRole === 'member')
  const developmentEnvironment =
    environments.find((environment) => environment.slug === 'development') ?? null
  const selectedEnvironment =
    environments.find((environment) => environment.id === selectedEnvironmentId) ??
    (!canManageSecrets ? developmentEnvironment : null) ??
    environments.find((environment) => environment.isDefault) ??
    environments[0] ??
    null
  const environmentConfigs = configs
    .filter((config) => config.environmentId === selectedEnvironment?.id)
    .sort((left, right) => {
      if (left.type !== right.type) return left.type === 'root' ? -1 : 1
      return left.createdAt.localeCompare(right.createdAt)
    })
  const selectedConfig =
    environmentConfigs.find((config) => config.id === selectedConfigId) ??
    environmentConfigs.find((config) => config.type === 'root') ??
    environmentConfigs[0] ??
    null
  const canEditSelectedConfig =
    Boolean(selectedConfig?.canEdit) || (canManageSecrets && selectedConfig?.type === 'root')

  useEffect(() => {
    if (!selectedEnvironmentId && selectedEnvironment?.id) {
      setSelectedEnvironmentId(selectedEnvironment.id)
    }
  }, [selectedEnvironment?.id, selectedEnvironmentId])

  useEffect(() => {
    if (selectedConfig?.id && selectedConfigId !== selectedConfig.id) {
      setSelectedConfigId(selectedConfig.id)
    }
  }, [selectedConfig?.id, selectedConfigId])

  async function createBranch(): Promise<void> {
    if (!selectedEnvironment || !selectedConfig || !newBranchName.trim()) {
      return
    }

    const slug = newBranchName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const created = await createConfig.mutateAsync({
      environmentId: selectedEnvironment.id,
      parentConfigId:
        selectedConfig.type === 'root' ? selectedConfig.id : selectedConfig.parentConfigId,
      name: newBranchName.trim(),
      slug,
    })
    setNewBranchName('')
    setSelectedConfigId(created.config.id)
  }

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
          {canCreateSecrets && canEditSelectedConfig ? (
            <Button onClick={() => setIsAddOpen(true)} type="button">
              <Plus className="mr-2 h-4 w-4" />
              Add variable
            </Button>
          ) : null}
        </div>
      </div>

      {environments.length > 0 ? (
        <div className="mb-4 border-b border-border">
          <div className="flex gap-1 overflow-x-auto">
            {environments.map((environment) => (
              <button
                className={`border-b-2 px-4 py-2 text-sm ${
                  environment.id === selectedEnvironment?.id
                    ? 'border-accent text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                key={environment.id}
                onClick={() => {
                  setSelectedEnvironmentId(environment.id)
                  setSelectedConfigId(null)
                }}
                type="button"
              >
                {environment.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {environmentConfigs.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {environmentConfigs.map((config) => (
            <div
              className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs ${
                config.id === selectedConfig?.id
                  ? 'border-accent bg-accent/10 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
              key={config.id}
            >
              <button
                className="inline-flex items-center gap-2"
                onClick={() => setSelectedConfigId(config.id)}
                type="button"
              >
                <GitBranch className="h-3.5 w-3.5" />
                {config.type === 'root' ? `${config.name} protected` : config.name}
              </button>
              {canManageSecrets && config.type === 'branch' ? (
                <button
                  aria-label={`Delete ${config.name}`}
                  className="rounded p-0.5 hover:bg-danger/15 hover:text-danger"
                  onClick={() => {
                    void deleteConfig.mutateAsync(config.id)
                  }}
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          ))}
          {canCreateSecrets && selectedEnvironment ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                void createBranch()
              }}
            >
              <Input
                className="h-8 w-40"
                onChange={(event) => setNewBranchName(event.target.value)}
                placeholder="New branch"
                value={newBranchName}
              />
              <Button
                disabled={createConfig.isPending || !newBranchName.trim()}
                size="sm"
                type="submit"
                variant="outline"
              >
                Create
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      <SecretsList
        canManage={canEditSelectedConfig}
        canRequestMerge={Boolean(
          selectedConfig?.type === 'branch' && selectedConfig.canEdit && selectedConfig.id
        )}
        configId={selectedConfig?.id ?? null}
        enabled={canAccessProject}
        environmentId={selectedEnvironment?.id ?? null}
        environmentSlug={selectedEnvironment?.slug ?? 'development'}
        projectId={projectId}
        search={search}
      />

      {canCreateSecrets ? (
        <AddSecretDialog
          configId={selectedConfig?.id ?? null}
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
