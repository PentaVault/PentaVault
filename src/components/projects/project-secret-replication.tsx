'use client'

import { ArrowRight, CopyCheck, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjectConfigs } from '@/lib/hooks/use-project-configuration'
import {
  useCreateSecretReplication,
  useDeleteSecretReplication,
  useSecretReplications,
  useSetSecretReplicationEnabled,
  useSyncSecretReplication,
} from '@/lib/hooks/use-secret-replications'
import { useToast } from '@/lib/hooks/use-toast'
import type { SecretReplication, SecretReplicationStatus } from '@/lib/types/api'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

const STATUS_STYLES: Record<SecretReplicationStatus, string> = {
  pending: 'border-border text-muted-foreground',
  succeeded: 'border-accent/40 bg-accent-muted text-accent-strong',
  // A conflict is not a failure — the sync ran and left something alone on
  // purpose — so it reads as a warning rather than an error.
  conflicted: 'border-warning/40 bg-warning-muted text-warning',
  failed: 'border-danger/40 bg-danger/10 text-danger',
}

const STATUS_LABELS: Record<SecretReplicationStatus, string> = {
  pending: 'Never synced',
  succeeded: 'In sync',
  conflicted: 'Needs attention',
  failed: 'Failed',
}

function ReplicationRow({
  projectId,
  replication,
  configName,
}: {
  projectId: string
  replication: SecretReplication
  configName: (configId: string) => string
}) {
  const { toast } = useToast()
  const syncReplication = useSyncSecretReplication(projectId)
  const setEnabled = useSetSecretReplicationEnabled(projectId)
  const deleteReplication = useDeleteSecretReplication(projectId)

  async function handleSync(): Promise<void> {
    try {
      const { result } = await syncReplication.mutateAsync(replication.id)
      if (result.conflicted > 0) {
        toast.error(
          `${result.conflicted} secret(s) left unchanged: ${result.conflictingNames.join(', ')}. ` +
            'Remove or rename them in the target folder to let replication manage them.'
        )
        return
      }
      toast.success(
        `Synced: ${result.created} added, ${result.updated} updated, ${result.removed} removed.`
      )
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to sync this replication right now.'))
    }
  }

  async function handleToggle(): Promise<void> {
    try {
      await setEnabled.mutateAsync({
        replicationId: replication.id,
        enabled: !replication.enabled,
      })
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update this replication right now.'))
    }
  }

  async function handleDelete(deleteReplicatedSecrets: boolean): Promise<void> {
    try {
      await deleteReplication.mutateAsync({
        replicationId: replication.id,
        deleteReplicatedSecrets,
      })
      toast.success(
        deleteReplicatedSecrets
          ? 'Replication removed and its copies deleted.'
          : 'Replication removed. Its copies stay as ordinary secrets.'
      )
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to remove this replication right now.'))
    }
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">
            {configName(replication.sourceConfigId)}
            <span className="font-mono text-xs text-muted-foreground">
              {replication.sourceFolderPath}
            </span>
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">
            {configName(replication.targetConfigId)}
            <span className="font-mono text-xs text-muted-foreground">
              {replication.targetFolderPath}
            </span>
          </span>
          <Badge className={cn('border', STATUS_STYLES[replication.lastSyncStatus])}>
            {STATUS_LABELS[replication.lastSyncStatus]}
          </Badge>
          {replication.enabled ? null : (
            <Badge className="border border-border text-muted-foreground">Paused</Badge>
          )}
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          {replication.managedSecretCount} secret(s) managed
          {replication.lastSyncedAt
            ? ` · last synced ${new Date(replication.lastSyncedAt).toLocaleString()}`
            : ' · not yet synced'}
        </p>
        {replication.lastSyncError ? (
          <p className="mt-1 text-xs text-warning">{replication.lastSyncError}</p>
        ) : null}
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
        <Button
          disabled={syncReplication.isPending || !replication.enabled}
          onClick={() => void handleSync()}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Sync now
        </Button>
        <Button
          disabled={setEnabled.isPending}
          onClick={() => void handleToggle()}
          size="sm"
          type="button"
          variant={replication.enabled ? 'outline' : 'default'}
        >
          {replication.enabled ? 'Pause' : 'Resume'}
        </Button>
        <Button
          aria-label="Remove replication and keep its copies"
          disabled={deleteReplication.isPending}
          onClick={() => void handleDelete(false)}
          size="sm"
          type="button"
          variant="outline"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        {/* No aria-label: the visible text is already the accessible name, and
            overriding it with different wording would read as two labels. */}
        <Button
          disabled={deleteReplication.isPending}
          onClick={() => void handleDelete(true)}
          size="sm"
          type="button"
          variant="danger"
        >
          Delete with copies
        </Button>
      </div>
    </div>
  )
}

export function ProjectSecretReplication({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const { data, isPending, isError } = useSecretReplications(projectId)
  const { data: configData } = useProjectConfigs(projectId)
  const createReplication = useCreateSecretReplication(projectId)

  const [sourceConfigId, setSourceConfigId] = useState('')
  const [sourceFolderPath, setSourceFolderPath] = useState('/')
  const [targetConfigId, setTargetConfigId] = useState('')
  const [targetFolderPath, setTargetFolderPath] = useState('/')

  const configs = configData?.configs ?? []
  const configName = (configId: string): string =>
    configs.find((config) => config.id === configId)?.name ?? configId

  async function handleCreate(): Promise<void> {
    if (!sourceConfigId || !targetConfigId) {
      toast.error('Choose both a source and a target config.')
      return
    }

    try {
      await createReplication.mutateAsync({
        sourceConfigId,
        sourceFolderPath: sourceFolderPath.trim() || '/',
        targetConfigId,
        targetFolderPath: targetFolderPath.trim() || '/',
      })
      setSourceConfigId('')
      setTargetConfigId('')
      setSourceFolderPath('/')
      setTargetFolderPath('/')
      toast.success('Replication created. Sync it to copy the values across.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to create this replication right now.'))
    }
  }

  const replications = data?.replications ?? []

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CopyCheck className="h-4 w-4 text-muted-foreground" />
          Secret replication
        </CardTitle>
        <CardDescription>
          Keep a folder in one config in step with a folder in another, so a value shared across
          environments is defined once instead of copy-pasted. The source is the authority: an edit
          made to a copy is put back on the next sync. A secret replication does not manage is never
          overwritten or deleted — it is reported as a conflict for you to resolve.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-md border border-border bg-surface-muted p-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor="replication-source-config"
            >
              Source config
            </label>
            <Select onValueChange={setSourceConfigId} value={sourceConfigId}>
              <SelectTrigger aria-label="Source config" id="replication-source-config">
                <SelectValue placeholder="Choose a config" />
              </SelectTrigger>
              <SelectContent>
                {configs.map((config) => (
                  <SelectItem key={config.id} value={config.id}>
                    {config.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              aria-label="Source folder"
              onChange={(event) => setSourceFolderPath(event.target.value)}
              placeholder="/"
              value={sourceFolderPath}
            />
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor="replication-target-config"
            >
              Target config
            </label>
            <Select onValueChange={setTargetConfigId} value={targetConfigId}>
              <SelectTrigger aria-label="Target config" id="replication-target-config">
                <SelectValue placeholder="Choose a config" />
              </SelectTrigger>
              <SelectContent>
                {configs.map((config) => (
                  <SelectItem key={config.id} value={config.id}>
                    {config.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              aria-label="Target folder"
              onChange={(event) => setTargetFolderPath(event.target.value)}
              placeholder="/"
              value={targetFolderPath}
            />
          </div>

          <div className="sm:col-span-2">
            <Button
              disabled={createReplication.isPending}
              onClick={() => void handleCreate()}
              size="sm"
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              Add replication
            </Button>
          </div>
        </div>

        {isPending ? (
          <p className="text-sm text-muted-foreground">Loading replications...</p>
        ) : null}
        {isError ? (
          <p className="text-sm text-danger">Unable to load replications right now.</p>
        ) : null}
        {!isPending && !isError && replications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No replications yet.</p>
        ) : null}

        {replications.map((replication) => (
          <ReplicationRow
            configName={configName}
            key={replication.id}
            projectId={projectId}
            replication={replication}
          />
        ))}
      </CardContent>
    </Card>
  )
}
