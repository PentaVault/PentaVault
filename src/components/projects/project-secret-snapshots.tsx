'use client'

import { Camera, History, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  useCreateSecretSnapshot,
  useDeleteSecretSnapshot,
  useProjectSecretSnapshots,
  useRestoreSecretSnapshot,
} from '@/lib/hooks/use-secret-snapshots'
import { useToast } from '@/lib/hooks/use-toast'
import type { SecretSnapshot } from '@/lib/types/models'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function ProjectSecretSnapshots({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const configsQuery = useProjectConfigs(projectId)
  const configs = useMemo(() => configsQuery.data?.configs ?? [], [configsQuery.data])

  const [selectedConfigId, setSelectedConfigId] = useState<string>('')
  const [label, setLabel] = useState('')
  const [restoreTarget, setRestoreTarget] = useState<SecretSnapshot | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SecretSnapshot | null>(null)

  useEffect(() => {
    if (!selectedConfigId && configs.length > 0) {
      setSelectedConfigId(configs[0].id)
    }
  }, [configs, selectedConfigId])

  const snapshotsQuery = useProjectSecretSnapshots(projectId, selectedConfigId || null)
  const createSnapshot = useCreateSecretSnapshot(projectId)
  const restoreSnapshot = useRestoreSecretSnapshot(projectId)
  const deleteSnapshot = useDeleteSecretSnapshot(projectId)

  const snapshots = snapshotsQuery.data?.snapshots ?? []
  const selectedConfig = configs.find((config) => config.id === selectedConfigId)

  async function handleCreate() {
    if (!selectedConfigId) {
      toast.error('Select a config to snapshot.')
      return
    }
    try {
      const result = await createSnapshot.mutateAsync({
        configId: selectedConfigId,
        environmentId: selectedConfig?.environmentId ?? null,
        label: label.trim() ? label.trim() : null,
      })
      toast.success(`Snapshot captured (${result.snapshot.secretCount} secrets).`)
      setLabel('')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to capture a snapshot right now.'))
    }
  }

  async function handleRestore() {
    if (!restoreTarget) return
    try {
      const result = await restoreSnapshot.mutateAsync(restoreTarget.id)
      const skippedNote =
        result.skipped.length > 0 ? ` ${result.skipped.length} skipped (deleted since).` : ''
      toast.success(`Restored ${result.restored} secrets.${skippedNote}`)
      setRestoreTarget(null)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to restore this snapshot right now.'))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteSnapshot.mutateAsync(deleteTarget.id)
      toast.success('Snapshot deleted.')
      setDeleteTarget(null)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to delete this snapshot right now.'))
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-border">
      <div className="flex items-start gap-3 border-b border-border px-4 py-4">
        <History className="mt-0.5 h-5 w-5 text-accent" aria-hidden />
        <div>
          <p className="text-sm font-medium">Point-in-time snapshots</p>
          <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
            Capture the current values of a config&apos;s secrets, then restore them all at once.
            Restores create new versions, so nothing is lost.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium" htmlFor="snapshot-config">
            Config
          </label>
          <Select onValueChange={setSelectedConfigId} value={selectedConfigId}>
            <SelectTrigger id="snapshot-config">
              <SelectValue placeholder="Select a config" />
            </SelectTrigger>
            <SelectContent>
              {configs.map((config) => (
                <SelectItem key={config.id} value={config.id}>
                  {config.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium" htmlFor="snapshot-label">
            Label (optional)
          </label>
          <Input
            id="snapshot-label"
            onChange={(event) => setLabel(event.target.value)}
            placeholder="before rotation"
            value={label}
          />
        </div>
        <Button
          disabled={!selectedConfigId || createSnapshot.isPending}
          onClick={() => void handleCreate()}
          type="button"
        >
          <Camera className="mr-1.5 h-4 w-4" aria-hidden />
          Capture
        </Button>
      </div>

      {snapshotsQuery.isError ? (
        <div className="px-4 py-4">
          <ErrorState
            title="Snapshots unavailable"
            message={getApiFriendlyMessage(snapshotsQuery.error, 'Unable to load snapshots.')}
            onRetry={() => void snapshotsQuery.refetch()}
          />
        </div>
      ) : snapshots.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          No snapshots for this config yet. Capture one to enable point-in-time restore.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {snapshots.map((snapshot) => (
            <li
              key={snapshot.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {snapshot.label ?? formatTimestamp(snapshot.createdAt)}
                  </span>
                  <Badge>{snapshot.secretCount} secrets</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Captured {formatTimestamp(snapshot.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setRestoreTarget(snapshot)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <History className="mr-1.5 h-4 w-4" aria-hidden />
                  Restore
                </Button>
                <Button
                  aria-label="Delete snapshot"
                  onClick={() => setDeleteTarget(snapshot)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4 text-danger" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog
        open={restoreTarget !== null}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Restore this snapshot?</AlertDialogTitle>
          <AlertDialogDescription>
            This creates a new version of every secret in the snapshot, setting each back to its
            captured value. Current values remain in version history.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={restoreSnapshot.isPending}
              onClick={() => void handleRestore()}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete this snapshot?</AlertDialogTitle>
          <AlertDialogDescription>
            The snapshot manifest will be removed. Secret values and their version history are not
            affected.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSnapshot.isPending}
              onClick={() => void handleDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
