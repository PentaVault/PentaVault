'use client'

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  CloudUpload,
  GitBranch,
  History,
  Pencil,
  Play,
  PlugZap,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { ErrorState } from '@/components/shared/error-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch, SwitchThumb } from '@/components/ui/switch'
import { useProjectEnvironments } from '@/lib/hooks/use-project-configuration'
import {
  useCreateSecretSync,
  useDeleteSecretSync,
  useProjectSecretSyncs,
  useRetrySecretSyncDelivery,
  useRunSecretSync,
  useSecretSyncDeliveries,
  useTestSecretSync,
  useUpdateSecretSync,
} from '@/lib/hooks/use-secret-syncs'
import { useToast } from '@/lib/hooks/use-toast'
import type { CreateSecretSyncInput, UpdateSecretSyncInput } from '@/lib/types/api'
import type { SecretSync, SecretSyncDeliveryStatus, SecretSyncProvider } from '@/lib/types/models'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

const VERCEL_TARGETS = ['production', 'preview', 'development'] as const

type FormState = {
  provider: SecretSyncProvider
  name: string
  credential: string
  environmentId: string
  folderPath: string
  autoSyncEnabled: boolean
  enabled: boolean
  maxAttempts: string
  githubScope: 'repository' | 'environment'
  githubOwner: string
  githubRepository: string
  githubEnvironment: string
  vercelProject: string
  vercelTeamId: string
  vercelTargets: Array<(typeof VERCEL_TARGETS)[number]>
  vercelGitBranch: string
}

const EMPTY_FORM: FormState = {
  provider: 'github',
  name: '',
  credential: '',
  environmentId: 'all',
  folderPath: '/',
  autoSyncEnabled: false,
  enabled: true,
  maxAttempts: '5',
  githubScope: 'repository',
  githubOwner: '',
  githubRepository: '',
  githubEnvironment: '',
  vercelProject: '',
  vercelTeamId: '',
  vercelTargets: ['production'],
  vercelGitBranch: '',
}

function statusTone(status: SecretSyncDeliveryStatus | null) {
  if (status === 'succeeded') return 'success' as const
  if (status === 'retry_scheduled' || status === 'pending' || status === 'processing') {
    return 'warning' as const
  }
  if (status === 'dead_letter') return 'danger' as const
  return 'neutral' as const
}

function statusLabel(status: SecretSyncDeliveryStatus | null) {
  return status ? status.replaceAll('_', ' ') : 'not synced'
}

function formatTimestamp(value: string | null) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function destinationLabel(sync: SecretSync) {
  const destination = sync.destinationConfig
  if ('owner' in destination) {
    const base = `${destination.owner}/${destination.repository}`
    return destination.scope === 'environment' ? `${base} · ${destination.environment}` : base
  }
  const target = destination.targets.join(', ')
  return `${destination.project} · ${target}${destination.gitBranch ? ` · ${destination.gitBranch}` : ''}`
}

function formForSync(sync: SecretSync): FormState {
  const destination = sync.destinationConfig
  return {
    ...EMPTY_FORM,
    provider: sync.provider,
    name: sync.name,
    environmentId: sync.environmentId ?? 'all',
    folderPath: sync.folderPath,
    autoSyncEnabled: sync.autoSyncEnabled,
    enabled: sync.enabled,
    maxAttempts: String(sync.maxAttempts),
    ...('owner' in destination
      ? {
          githubScope: destination.scope,
          githubOwner: destination.owner,
          githubRepository: destination.repository,
          githubEnvironment: destination.environment ?? '',
        }
      : {
          vercelProject: destination.project,
          vercelTeamId: destination.teamId ?? '',
          vercelTargets: destination.targets,
          vercelGitBranch: destination.gitBranch ?? '',
        }),
  }
}

function destinationFromForm(form: FormState) {
  return form.provider === 'github'
    ? {
        scope: form.githubScope,
        owner: form.githubOwner.trim(),
        repository: form.githubRepository.trim(),
        ...(form.githubScope === 'environment'
          ? { environment: form.githubEnvironment.trim() }
          : {}),
      }
    : {
        project: form.vercelProject.trim(),
        ...(form.vercelTeamId.trim() ? { teamId: form.vercelTeamId.trim() } : {}),
        targets: form.vercelTargets,
        ...(form.vercelGitBranch.trim() ? { gitBranch: form.vercelGitBranch.trim() } : {}),
      }
}

export function ProjectSecretSyncs({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const syncsQuery = useProjectSecretSyncs(projectId)
  const environmentsQuery = useProjectEnvironments(projectId)
  const createSync = useCreateSecretSync(projectId)
  const updateSync = useUpdateSecretSync(projectId)
  const deleteSync = useDeleteSecretSync(projectId)
  const testSync = useTestSecretSync(projectId)
  const runSync = useRunSecretSync(projectId)
  const retryDelivery = useRetrySecretSyncDelivery(projectId)
  const [formOpen, setFormOpen] = useState(false)
  const [editingSync, setEditingSync] = useState<SecretSync | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<SecretSync | null>(null)
  const [deliverySyncId, setDeliverySyncId] = useState<string | null>(null)
  const deliveriesQuery = useSecretSyncDeliveries(
    projectId,
    deliverySyncId,
    Boolean(deliverySyncId)
  )
  const environments = environmentsQuery.data?.environments ?? []
  const environmentNames = useMemo(
    () => new Map(environments.map((environment) => [environment.id, environment.name])),
    [environments]
  )
  const isSaving = createSync.isPending || updateSync.isPending

  function openCreate() {
    setEditingSync(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEdit(sync: SecretSync) {
    setEditingSync(sync)
    setForm(formForSync(sync))
    setFormOpen(true)
  }

  function toggleVercelTarget(target: (typeof VERCEL_TARGETS)[number], checked: boolean) {
    setForm((current) => ({
      ...current,
      vercelTargets: checked
        ? [...new Set([...current.vercelTargets, target])]
        : current.vercelTargets.filter((value) => value !== target),
    }))
  }

  async function save() {
    const attempts = Number(form.maxAttempts)
    if (!form.name.trim() || !Number.isInteger(attempts) || attempts < 1 || attempts > 10) {
      toast.error('Add a name and choose a retry limit from 1 to 10.')
      return
    }
    if (!editingSync && !form.credential.trim()) {
      toast.error('A provider access token is required.')
      return
    }
    if (
      (form.provider === 'github' &&
        (!form.githubOwner.trim() ||
          !form.githubRepository.trim() ||
          (form.githubScope === 'environment' && !form.githubEnvironment.trim()))) ||
      (form.provider === 'vercel' &&
        (!form.vercelProject.trim() || form.vercelTargets.length === 0))
    ) {
      toast.error('Complete the provider destination before saving.')
      return
    }

    const common = {
      name: form.name.trim(),
      environmentId: form.environmentId === 'all' ? null : form.environmentId,
      folderPath: form.folderPath.trim() || '/',
      autoSyncEnabled: form.autoSyncEnabled,
      enabled: form.enabled,
      maxAttempts: attempts,
    }
    try {
      if (editingSync) {
        const input: UpdateSecretSyncInput = {
          ...common,
          destinationConfig: destinationFromForm(form),
          ...(form.credential.trim() ? { credential: form.credential.trim() } : {}),
        }
        await updateSync.mutateAsync({ syncId: editingSync.id, input })
        toast.success('Deployment sync updated.')
      } else {
        const destinationConfig = destinationFromForm(form)
        const input = {
          ...common,
          provider: form.provider,
          credential: form.credential.trim(),
          destinationConfig,
        } as CreateSecretSyncInput
        await createSync.mutateAsync(input)
        toast.success('Deployment sync created. Test it before enabling automatic delivery.')
      }
      setFormOpen(false)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to save this deployment sync.'))
    }
  }

  async function setAutomatic(sync: SecretSync, enabled: boolean) {
    try {
      await updateSync.mutateAsync({ syncId: sync.id, input: { autoSyncEnabled: enabled } })
      toast.success(enabled ? 'Automatic sync enabled.' : 'Automatic sync paused.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update automatic sync.'))
    }
  }

  async function test(sync: SecretSync) {
    try {
      await testSync.mutateAsync(sync.id)
      toast.success('Connection verified without writing secret values.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Connection test failed.'))
    }
  }

  async function run(sync: SecretSync) {
    try {
      const result = await runSync.mutateAsync(sync.id)
      if (result.delivery.status === 'succeeded') toast.success('Secrets synced successfully.')
      else toast.error(`Sync finished with status: ${statusLabel(result.delivery.status)}.`)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to run this sync.'))
    }
  }

  async function remove() {
    if (!deleteTarget) return
    try {
      await deleteSync.mutateAsync(deleteTarget.id)
      if (deliverySyncId === deleteTarget.id) setDeliverySyncId(null)
      setDeleteTarget(null)
      toast.success('Sync removed. Provider-side values were left intact.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to remove this sync.'))
    }
  }

  async function replay(deliveryId: string) {
    try {
      const result = await retryDelivery.mutateAsync(deliveryId)
      if (result.delivery.status === 'succeeded') toast.success('Delivery replayed successfully.')
      else toast.error(`Replay finished with status: ${statusLabel(result.delivery.status)}.`)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to replay this delivery.'))
    }
  }

  return (
    <section
      className="mt-6 rounded-lg border border-border"
      aria-labelledby="secret-syncs-heading"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4">
        <div>
          <div className="flex items-center gap-2">
            <CloudUpload className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-medium" id="secret-syncs-heading">
              Deployment syncs
            </h3>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Deliver scoped Compatibility Mode secrets to GitHub Actions or Vercel. Credentials are
            encrypted, jobs are version-aware, and remote values are never deleted automatically.
          </p>
        </div>
        <Button onClick={openCreate} size="sm" type="button" variant="outline">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add sync
        </Button>
      </div>

      {syncsQuery.isLoading ? (
        <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading deployment syncs...
        </div>
      ) : syncsQuery.isError ? (
        <div className="p-4">
          <ErrorState
            title="Deployment syncs unavailable"
            message={getApiFriendlyMessage(syncsQuery.error, 'Unable to load deployment syncs.')}
            onRetry={() => void syncsQuery.refetch()}
          />
        </div>
      ) : (syncsQuery.data?.syncs.length ?? 0) === 0 ? (
        <div className="px-4 py-9 text-center">
          <CloudUpload className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No deployment syncs</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a least-privilege provider connection, test it, then run the first sync manually.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {syncsQuery.data?.syncs.map((sync) => {
            const historyOpen = deliverySyncId === sync.id
            return (
              <div key={sync.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{sync.name}</p>
                      <Badge>{sync.provider === 'github' ? 'GitHub Actions' : 'Vercel'}</Badge>
                      <StatusBadge tone={statusTone(sync.lastStatus)}>
                        {statusLabel(sync.lastStatus)}
                      </StatusBadge>
                      {!sync.enabled ? <Badge>Paused</Badge> : null}
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-foreground/80">
                      {destinationLabel(sync)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {sync.environmentId
                        ? (environmentNames.get(sync.environmentId) ?? 'Selected environment')
                        : 'All environments'}{' '}
                      · {sync.folderPath} · token {sync.credentialHint} · last sync{' '}
                      {formatTimestamp(sync.lastSyncedAt)}
                    </p>
                    {sync.lastError ? (
                      <p className="mt-2 flex items-start gap-1.5 text-xs text-danger">
                        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {sync.lastError}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <div className="mr-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Auto</span>
                      <Switch
                        checked={sync.autoSyncEnabled}
                        className={cn(
                          'relative h-5 w-9 rounded-full border border-border bg-background-elevated transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent/35',
                          updateSync.isPending && 'opacity-60'
                        )}
                        disabled={!sync.enabled || updateSync.isPending}
                        onCheckedChange={(checked) => void setAutomatic(sync, checked)}
                      >
                        <SwitchThumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-foreground transition-transform data-[state=checked]:translate-x-4" />
                      </Switch>
                    </div>
                    <Button
                      disabled={testSync.isPending || !sync.enabled}
                      onClick={() => void test(sync)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <PlugZap className="mr-1.5 h-3.5 w-3.5" /> Test
                    </Button>
                    <Button
                      disabled={runSync.isPending || !sync.enabled}
                      onClick={() => void run(sync)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Play className="mr-1.5 h-3.5 w-3.5" /> Sync now
                    </Button>
                    <Button
                      onClick={() => setDeliverySyncId(historyOpen ? null : sync.id)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <History className="mr-1.5 h-3.5 w-3.5" /> History
                      {historyOpen ? (
                        <ChevronUp className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="ml-1 h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      aria-label={`Edit ${sync.name}`}
                      onClick={() => openEdit(sync)}
                      className="px-2"
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      aria-label={`Delete ${sync.name}`}
                      onClick={() => setDeleteTarget(sync)}
                      className="px-2"
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                    </Button>
                  </div>
                </div>

                {historyOpen ? (
                  <div className="mt-4 rounded-md border border-border bg-background/40">
                    {deliveriesQuery.isLoading ? (
                      <p className="px-3 py-4 text-xs text-muted-foreground">Loading history...</p>
                    ) : (deliveriesQuery.data?.deliveries.length ?? 0) === 0 ? (
                      <p className="px-3 py-4 text-xs text-muted-foreground">No deliveries yet.</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {deliveriesQuery.data?.deliveries.map((delivery) => (
                          <div
                            className="flex flex-wrap items-center justify-between gap-3 px-3 py-3"
                            key={delivery.id}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                {delivery.status === 'succeeded' ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                ) : (
                                  <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                                <StatusBadge tone={statusTone(delivery.status)}>
                                  {statusLabel(delivery.status)}
                                </StatusBadge>
                                <span className="text-xs text-muted-foreground">
                                  {delivery.reason} · attempt {delivery.attemptCount}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {delivery.secretCount ?? 0} scoped · {delivery.changedCount ?? 0}{' '}
                                changed ·{' '}
                                {formatTimestamp(delivery.completedAt ?? delivery.createdAt)}
                              </p>
                              {delivery.lastError ? (
                                <p className="mt-1 text-xs text-danger">{delivery.lastError}</p>
                              ) : null}
                            </div>
                            {delivery.status === 'dead_letter' ? (
                              <Button
                                disabled={retryDelivery.isPending}
                                onClick={() => void replay(delivery.id)}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Replay
                              </Button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/45" />
          <DialogContent className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl">
            <DialogTitle>
              {editingSync ? 'Edit deployment sync' : 'Add deployment sync'}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Use a least-privilege token. PentaVault encrypts it and never displays it again.
            </DialogDescription>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 text-xs">
                <span className="font-medium">Name</span>
                <Input
                  aria-label="Name"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Production deploy"
                  value={form.name}
                />
              </div>
              <div className="space-y-1.5 text-xs">
                <span className="font-medium">Provider</span>
                <Select
                  disabled={Boolean(editingSync)}
                  onValueChange={(provider: SecretSyncProvider) =>
                    setForm((current) => ({ ...current, provider }))
                  }
                  value={form.provider}
                >
                  <SelectTrigger aria-label="Provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="github">GitHub Actions</SelectItem>
                    <SelectItem value="vercel">Vercel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 block space-y-1.5 text-xs">
              <span className="font-medium">Provider access token</span>
              <Input
                aria-label="Provider access token"
                autoComplete="off"
                onChange={(event) =>
                  setForm((current) => ({ ...current, credential: event.target.value }))
                }
                placeholder={
                  editingSync ? `Leave blank to keep ${editingSync.credentialHint}` : 'Paste token'
                }
                type="password"
                value={form.credential}
              />
            </div>

            {form.provider === 'github' ? (
              <div className="mt-4 rounded-md border border-border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <GitBranch className="h-4 w-4 text-accent" /> GitHub destination
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 text-xs">
                    <span>Scope</span>
                    <Select
                      onValueChange={(githubScope: 'repository' | 'environment') =>
                        setForm((current) => ({ ...current, githubScope }))
                      }
                      value={form.githubScope}
                    >
                      <SelectTrigger aria-label="GitHub scope">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="repository">Repository secrets</SelectItem>
                        <SelectItem value="environment">Environment secrets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <span>Owner</span>
                    <Input
                      aria-label="GitHub owner"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, githubOwner: event.target.value }))
                      }
                      placeholder="acme"
                      value={form.githubOwner}
                    />
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <span>Repository</span>
                    <Input
                      aria-label="GitHub repository"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, githubRepository: event.target.value }))
                      }
                      placeholder="web"
                      value={form.githubRepository}
                    />
                  </div>
                  {form.githubScope === 'environment' ? (
                    <div className="space-y-1.5 text-xs">
                      <span>GitHub environment</span>
                      <Input
                        aria-label="GitHub environment"
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            githubEnvironment: event.target.value,
                          }))
                        }
                        placeholder="production"
                        value={form.githubEnvironment}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-border p-4">
                <p className="text-sm font-medium">Vercel destination</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 text-xs">
                    <span>Project ID or name</span>
                    <Input
                      aria-label="Vercel project"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, vercelProject: event.target.value }))
                      }
                      placeholder="web"
                      value={form.vercelProject}
                    />
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <span>Team ID (optional)</span>
                    <Input
                      aria-label="Vercel team ID"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, vercelTeamId: event.target.value }))
                      }
                      placeholder="team_..."
                      value={form.vercelTeamId}
                    />
                  </div>
                  <div className="space-y-1.5 text-xs sm:col-span-2">
                    <span>Preview branch (optional)</span>
                    <Input
                      aria-label="Vercel preview branch"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, vercelGitBranch: event.target.value }))
                      }
                      placeholder="main"
                      value={form.vercelGitBranch}
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-4">
                  {VERCEL_TARGETS.map((target) => (
                    <div className="flex items-center gap-2 text-xs capitalize" key={target}>
                      <Checkbox
                        aria-label={`Vercel ${target}`}
                        checked={form.vercelTargets.includes(target)}
                        onCheckedChange={(checked) => toggleVercelTarget(target, checked === true)}
                      />
                      {target}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 text-xs">
                <span>Source environment</span>
                <Select
                  onValueChange={(environmentId) =>
                    setForm((current) => ({ ...current, environmentId }))
                  }
                  value={form.environmentId}
                >
                  <SelectTrigger aria-label="Source environment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All environments</SelectItem>
                    {environments.map((environment) => (
                      <SelectItem key={environment.id} value={environment.id}>
                        {environment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 text-xs">
                <span>Folder path</span>
                <Input
                  aria-label="Folder path"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, folderPath: event.target.value }))
                  }
                  placeholder="/services/api"
                  value={form.folderPath}
                />
              </div>
              <div className="space-y-1.5 text-xs">
                <span>Retry attempts</span>
                <Input
                  aria-label="Retry attempts"
                  max="10"
                  min="1"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, maxAttempts: event.target.value }))
                  }
                  type="number"
                  value={form.maxAttempts}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-5 rounded-md border border-border p-3">
              <div className="flex items-center gap-2 text-xs">
                <Switch
                  aria-label="Destination enabled"
                  checked={form.enabled}
                  onCheckedChange={(enabled) => setForm((current) => ({ ...current, enabled }))}
                >
                  <SwitchThumb />
                </Switch>
                Destination enabled
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Switch
                  aria-label="Automatic sync"
                  checked={form.autoSyncEnabled}
                  onCheckedChange={(autoSyncEnabled) =>
                    setForm((current) => ({ ...current, autoSyncEnabled }))
                  }
                >
                  <SwitchThumb />
                </Switch>
                Automatically sync changed versions
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setFormOpen(false)} type="button" variant="ghost">
                Cancel
              </Button>
              <Button disabled={isSaving} onClick={() => void save()} type="button">
                {isSaving ? 'Saving...' : editingSync ? 'Save changes' : 'Add sync'}
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Remove deployment sync?</AlertDialogTitle>
          <AlertDialogDescription>
            PentaVault will remove this connection and delivery history. Existing provider-side
            values remain intact.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSync.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleteSync.isPending} onClick={() => void remove()}>
              {deleteSync.isPending ? 'Removing...' : 'Remove sync'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
