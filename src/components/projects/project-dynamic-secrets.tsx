'use client'

import { Copy, KeyRound, Pencil, Plus, RotateCcw, Trash2, Zap } from 'lucide-react'
import { useState } from 'react'

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch, SwitchThumb } from '@/components/ui/switch'
import {
  useCreateDynamicSecret,
  useDeleteDynamicSecret,
  useDynamicSecretLeases,
  useIssueDynamicSecretLease,
  useProjectDynamicSecrets,
  useRevokeDynamicSecretLease,
  useUpdateDynamicSecret,
} from '@/lib/hooks/use-dynamic-secrets'
import { useToast } from '@/lib/hooks/use-toast'
import type { CreateDynamicSecretInput, UpdateDynamicSecretInput } from '@/lib/types/api'
import type { DynamicSecret, DynamicSecretLeaseStatus } from '@/lib/types/models'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type SecretForm = {
  name: string
  prefix: string
  length: string
  defaultTtlSeconds: string
  maxTtlSeconds: string
  enabled: boolean
}

const EMPTY_FORM: SecretForm = {
  name: '',
  prefix: '',
  length: '32',
  defaultTtlSeconds: '3600',
  maxTtlSeconds: '86400',
  enabled: true,
}

function leaseStatusTone(status: DynamicSecretLeaseStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'expired') return 'neutral'
  return 'warning'
}

function formatTtl(seconds: number): string {
  if (seconds % 86400 === 0) return `${seconds / 86400}d`
  if (seconds % 3600 === 0) return `${seconds / 3600}h`
  if (seconds % 60 === 0) return `${seconds / 60}m`
  return `${seconds}s`
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  )
}

function secretToForm(secret: DynamicSecret): SecretForm {
  const config = secret.config as { prefix?: unknown; length?: unknown }
  return {
    name: secret.name,
    prefix: typeof config.prefix === 'string' ? config.prefix : '',
    length: typeof config.length === 'number' ? String(config.length) : '32',
    defaultTtlSeconds: String(secret.defaultTtlSeconds),
    maxTtlSeconds: String(secret.maxTtlSeconds),
    enabled: secret.enabled,
  }
}

function LeaseList({ projectId, secret }: { projectId: string; secret: DynamicSecret }) {
  const { toast } = useToast()
  const leasesQuery = useDynamicSecretLeases(projectId, secret.id)
  const revokeLease = useRevokeDynamicSecretLease(projectId)
  const leases = leasesQuery.data?.leases ?? []

  if (leases.length === 0) {
    return (
      <p className="px-4 py-3 text-xs text-muted-foreground">
        No leases issued yet. Issue one to mint an ephemeral credential.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {leases.map((lease) => (
        <li key={lease.id} className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-2">
            <StatusBadge tone={leaseStatusTone(lease.status)}>{lease.status}</StatusBadge>
            <span className="text-xs text-muted-foreground">
              Expires {formatTimestamp(lease.expiresAt)}
            </span>
          </div>
          {lease.status === 'active' ? (
            <Button
              onClick={async () => {
                try {
                  await revokeLease.mutateAsync(lease.id)
                  toast.success('Lease revoked.')
                } catch (error) {
                  toast.error(getApiFriendlyMessage(error, 'Unable to revoke this lease.'))
                }
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Revoke
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export function ProjectDynamicSecrets({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const secretsQuery = useProjectDynamicSecrets(projectId)
  const createSecret = useCreateDynamicSecret(projectId)
  const updateSecret = useUpdateDynamicSecret(projectId)
  const deleteSecret = useDeleteDynamicSecret(projectId)
  const issueLease = useIssueDynamicSecretLease(projectId)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<DynamicSecret | null>(null)
  const [form, setForm] = useState<SecretForm>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<DynamicSecret | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [issuedCredential, setIssuedCredential] = useState<string | null>(null)

  const secrets = secretsQuery.data?.dynamicSecrets ?? []
  const isSaving = createSecret.isPending || updateSecret.isPending

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setIsDialogOpen(true)
  }

  function openEdit(secret: DynamicSecret) {
    setEditing(secret)
    setForm(secretToForm(secret))
    setIsDialogOpen(true)
  }

  function buildPayload(): CreateDynamicSecretInput {
    return {
      name: form.name.trim(),
      config: {
        ...(form.prefix.trim() ? { prefix: form.prefix.trim() } : {}),
        length: Number(form.length) || 32,
      },
      defaultTtlSeconds: Number(form.defaultTtlSeconds) || 3600,
      maxTtlSeconds: Number(form.maxTtlSeconds) || 86400,
      enabled: form.enabled,
    }
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error('A name is required.')
      return
    }
    try {
      if (editing) {
        await updateSecret.mutateAsync({
          dynamicSecretId: editing.id,
          input: buildPayload() as UpdateDynamicSecretInput,
        })
        toast.success('Dynamic secret updated.')
      } else {
        await createSecret.mutateAsync(buildPayload())
        toast.success('Dynamic secret created.')
      }
      setIsDialogOpen(false)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to save this dynamic secret right now.'))
    }
  }

  async function handleIssue(secret: DynamicSecret) {
    try {
      const result = await issueLease.mutateAsync({ dynamicSecretId: secret.id })
      setIssuedCredential(result.credential)
      setExpanded(secret.id)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to issue a lease right now.'))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteSecret.mutateAsync(deleteTarget.id)
      toast.success('Dynamic secret deleted.')
      setDeleteTarget(null)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to delete this dynamic secret right now.'))
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-border">
      <div className="flex flex-col justify-between gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-5 w-5 text-accent" aria-hidden />
          <div>
            <p className="text-sm font-medium">Dynamic secrets</p>
            <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
              Mint short-lived, on-demand credentials as leases. Each lease expires automatically
              and can be revoked early. The credential is shown only once, at issue time.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} size="sm" type="button">
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          New dynamic secret
        </Button>
      </div>

      {secretsQuery.isError ? (
        <div className="px-4 py-4">
          <ErrorState
            title="Dynamic secrets unavailable"
            message={getApiFriendlyMessage(secretsQuery.error, 'Unable to load dynamic secrets.')}
            onRetry={() => void secretsQuery.refetch()}
          />
        </div>
      ) : secrets.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          No dynamic secrets yet. Create one to issue ephemeral, auto-expiring credentials.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {secrets.map((secret) => (
            <li key={secret.id}>
              <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{secret.name}</span>
                    <StatusBadge tone={secret.enabled ? 'success' : 'neutral'}>
                      {secret.enabled ? 'Enabled' : 'Disabled'}
                    </StatusBadge>
                    <Badge>TTL {formatTtl(secret.defaultTtlSeconds)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Generated credential · max {formatTtl(secret.maxTtlSeconds)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    disabled={!secret.enabled || issueLease.isPending}
                    onClick={() => void handleIssue(secret)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <KeyRound className="mr-1.5 h-4 w-4" aria-hidden />
                    Issue lease
                  </Button>
                  <Button
                    onClick={() => setExpanded(expanded === secret.id ? null : secret.id)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Leases
                  </Button>
                  <Button
                    aria-label={`Edit ${secret.name}`}
                    onClick={() => openEdit(secret)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    aria-label={`Delete ${secret.name}`}
                    onClick={() => setDeleteTarget(secret)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-danger" aria-hidden />
                  </Button>
                </div>
              </div>
              {expanded === secret.id ? (
                <div className="border-t border-border bg-background-elevated/40">
                  <LeaseList projectId={projectId} secret={secret} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/45" />
          <DialogContent className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl">
            <DialogTitle className="text-lg">
              {editing ? 'Edit dynamic secret' : 'New dynamic secret'}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Leases mint a random credential using the settings below.
            </DialogDescription>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="dyn-name">
                  Name
                </label>
                <Input
                  id="dyn-name"
                  onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))}
                  placeholder="db-readonly"
                  value={form.name}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium" htmlFor="dyn-prefix">
                    Credential prefix
                  </label>
                  <Input
                    id="dyn-prefix"
                    onChange={(event) => setForm((c) => ({ ...c, prefix: event.target.value }))}
                    placeholder="sk-"
                    value={form.prefix}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" htmlFor="dyn-length">
                    Credential length
                  </label>
                  <Input
                    id="dyn-length"
                    min={8}
                    onChange={(event) => setForm((c) => ({ ...c, length: event.target.value }))}
                    type="number"
                    value={form.length}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium" htmlFor="dyn-default-ttl">
                    Default TTL (seconds)
                  </label>
                  <Input
                    id="dyn-default-ttl"
                    min={60}
                    onChange={(event) =>
                      setForm((c) => ({ ...c, defaultTtlSeconds: event.target.value }))
                    }
                    type="number"
                    value={form.defaultTtlSeconds}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" htmlFor="dyn-max-ttl">
                    Max TTL (seconds)
                  </label>
                  <Input
                    id="dyn-max-ttl"
                    min={60}
                    onChange={(event) =>
                      setForm((c) => ({ ...c, maxTtlSeconds: event.target.value }))
                    }
                    type="number"
                    value={form.maxTtlSeconds}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Enabled</span>
                <Switch
                  aria-label="Enable dynamic secret"
                  checked={form.enabled}
                  className="relative h-5 w-9 rounded-full border border-border bg-background-elevated transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent/35"
                  onCheckedChange={(value) => setForm((c) => ({ ...c, enabled: value }))}
                >
                  <SwitchThumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-foreground transition-transform data-[state=checked]:translate-x-4" />
                </Switch>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button onClick={() => setIsDialogOpen(false)} type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={isSaving} onClick={() => void handleSubmit()} type="button">
                {editing ? 'Save changes' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <Dialog
        open={issuedCredential !== null}
        onOpenChange={(open) => !open && setIssuedCredential(null)}
      >
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/45" />
          <DialogContent className="fixed top-1/2 left-1/2 z-50 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-xl">
            <DialogTitle className="text-lg">Lease credential</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Copy this now. It is shown only once and cannot be retrieved again.
            </DialogDescription>
            <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-background-elevated px-3 py-2">
              <code className="min-w-0 flex-1 truncate font-mono text-sm">{issuedCredential}</code>
              <Button
                aria-label="Copy credential"
                onClick={() => {
                  if (issuedCredential) {
                    void navigator.clipboard?.writeText(issuedCredential)
                    toast.success('Credential copied.')
                  }
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Copy className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setIssuedCredential(null)} type="button">
                Done
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete dynamic secret</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{deleteTarget?.name}&quot; and all its leases will be removed. Issued credentials
            will stop being tracked. This cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSecret.isPending}
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
