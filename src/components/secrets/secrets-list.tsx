'use client'

import {
  Eye,
  EyeOff,
  FolderTree,
  KeyRound,
  Lock,
  MoreHorizontal,
  RotateCw,
  Shield,
  Trash2,
  Unlock,
  X,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { SpotlightCard } from '@/components/shared/spotlight-card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown'
import { Input } from '@/components/ui/input'
import { useCreateConfigChangeRequest } from '@/lib/hooks/use-project-configuration'
import { useCreateSecretAccessRequest } from '@/lib/hooks/use-projects'
import {
  useCancelSecretAccessRequest,
  useDeleteSecret,
  useProjectSecretAccess,
  useProjectSecrets,
  useRestoreSecretVersion,
  useSecretAccessRequests,
  useSecretVersions,
  useUpdateSecret,
  useUpdateSecretMetadata,
} from '@/lib/hooks/use-secrets'
import { useProjectMembers } from '@/lib/hooks/use-team'
import { useToast } from '@/lib/hooks/use-toast'
import { filterSecretsForWorkspace, parseSecretTagInput } from '@/lib/secrets/workspace'
import type { Secret, SecretAccessRequest, SecretAccessRequestStatus } from '@/lib/types/models'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessageWithRef } from '@/lib/utils/errors'
import { formatDateTime, formatRelativeDate } from '@/lib/utils/format'

export function SecretsList({
  canManage = false,
  canRequestMerge = false,
  configId,
  enabled = true,
  environmentId,
  environmentSlug,
  folderFilter = '*',
  projectId,
  search,
  tagFilter = '*',
}: {
  canManage?: boolean
  canRequestMerge?: boolean
  configId?: string | null
  enabled?: boolean
  environmentId?: string | null
  environmentSlug?: string
  folderFilter?: string
  projectId: string
  search: string
  tagFilter?: string
}) {
  const secretsQuery = useProjectSecrets(projectId, enabled, configId)
  const accessQuery = useProjectSecretAccess(projectId, enabled)
  const secretAccessRequestsQuery = useSecretAccessRequests(projectId, enabled)
  const membersQuery = useProjectMembers(projectId, enabled)
  const deleteSecret = useDeleteSecret()
  const createChangeRequest = useCreateConfigChangeRequest(projectId)
  const requestAccess = useCreateSecretAccessRequest(projectId)
  const cancelAccessRequest = useCancelSecretAccessRequest()
  const { toast } = useToast()

  const [selectedSecretIds, setSelectedSecretIds] = useState<Set<string>>(new Set())
  const [editTarget, setEditTarget] = useState<Secret | null>(null)
  const [historyTarget, setHistoryTarget] = useState<Secret | null>(null)
  const [metadataTarget, setMetadataTarget] = useState<Secret | null>(null)
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Secret | null>(null)
  const [deleteImpactTarget, setDeleteImpactTarget] = useState<Secret | null>(null)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [requestingSecretId, setRequestingSecretId] = useState<string | null>(null)
  const [locallyPendingSecretIds, setLocallyPendingSecretIds] = useState<Set<string>>(new Set())
  const [locallyCancelledSecretIds, setLocallyCancelledSecretIds] = useState<Set<string>>(new Set())
  const [requestCooldownUntil, setRequestCooldownUntil] = useState<Record<string, number>>({})

  const secrets = useMemo(() => {
    return secretsQuery.data ?? []
  }, [secretsQuery.data])
  const membersByUserId = useMemo(() => {
    return new Map((membersQuery.data?.members ?? []).map((member) => [member.userId, member]))
  }, [membersQuery.data?.members])
  const secretAccessUsers = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string; email: string | null }>>()
    const seen = new Set<string>()

    for (const access of accessQuery.data ?? []) {
      if (access.status !== 'active') {
        continue
      }

      const key = `${access.secretId}:${access.userId}`
      if (seen.has(key)) {
        continue
      }

      seen.add(key)
      const member = membersByUserId.get(access.userId)
      const name = member?.user?.name ?? member?.user?.email ?? access.userId
      const email = member?.user?.email ?? null
      const users = map.get(access.secretId) ?? []
      users.push({ id: access.userId, name, email })
      map.set(access.secretId, users)
    }

    return map
  }, [accessQuery.data, membersByUserId])
  const assignedSecretIds = useMemo(() => {
    return new Set(
      (accessQuery.data ?? [])
        .filter((access) => access.status === 'active')
        .map((access) => access.secretId)
    )
  }, [accessQuery.data])
  const latestAccessRequestBySecretId = useMemo(() => {
    const bySecretId = new Map<string, SecretAccessRequest>()

    for (const request of secretAccessRequestsQuery.data ?? []) {
      if (locallyCancelledSecretIds.has(request.secretId)) {
        continue
      }

      const current = bySecretId.get(request.secretId)
      if (!current || request.updatedAt.localeCompare(current.updatedAt) > 0) {
        bySecretId.set(request.secretId, request)
      }
    }

    for (const secretId of locallyPendingSecretIds) {
      if (!locallyCancelledSecretIds.has(secretId) && !bySecretId.has(secretId)) {
        bySecretId.set(secretId, {
          id: `local:${secretId}`,
          projectId,
          secretId,
          requesterId: '',
          status: 'pending',
          reviewedByUserId: null,
          reviewerNote: null,
          reviewedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
    }

    return bySecretId
  }, [
    locallyCancelledSecretIds,
    locallyPendingSecretIds,
    projectId,
    secretAccessRequestsQuery.data,
  ])
  const activeUserAccessCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const [secretId, users] of secretAccessUsers) {
      counts.set(secretId, users.length)
    }
    return counts
  }, [secretAccessUsers])
  const filtered = useMemo(() => {
    return filterSecretsForWorkspace(secrets, {
      folderPath: folderFilter,
      tag: tagFilter,
      search,
      ...(environmentId !== undefined ? { environmentId } : {}),
      ...(environmentSlug !== undefined ? { environmentSlug } : {}),
    })
  }, [environmentId, environmentSlug, folderFilter, secrets, search, tagFilter])

  const anySelected = canManage && selectedSecretIds.size > 0
  const selectedSecrets = canManage
    ? filtered.filter((secret) => selectedSecretIds.has(secret.id))
    : []
  const editTargets = editTarget ? [editTarget] : selectedSecrets
  const deleteTargetUsers = deleteTarget ? (secretAccessUsers.get(deleteTarget.id) ?? []) : []
  const deleteImpactUsers = deleteImpactTarget
    ? (secretAccessUsers.get(deleteImpactTarget.id) ?? [])
    : []

  function handleSelect(secretId: string, checked: boolean): void {
    if (!canManage) {
      return
    }

    setSelectedSecretIds((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(secretId)
      } else {
        next.delete(secretId)
      }
      return next
    })
  }

  async function handleRequestAccess(secret: Secret): Promise<void> {
    const cooldownUntil = requestCooldownUntil[secret.id] ?? 0
    if (cooldownUntil > Date.now()) {
      toast.error('Please wait before requesting this variable again.')
      return
    }

    try {
      setRequestingSecretId(secret.id)
      await requestAccess.mutateAsync({ secretId: secret.id })
      setLocallyPendingSecretIds((current) => new Set(current).add(secret.id))
      setLocallyCancelledSecretIds((current) => {
        const next = new Set(current)
        next.delete(secret.id)
        return next
      })
      setRequestCooldownUntil((current) => ({
        ...current,
        [secret.id]: Date.now() + 30_000,
      }))
      toast.success('Access request sent.')
    } catch (error) {
      toast.error(
        getApiFriendlyMessageWithRef(
          error,
          'Unable to request access right now. The server did not return a specific reason.'
        )
      )
    } finally {
      setRequestingSecretId(null)
    }
  }

  async function handleCancelAccessRequest(secret: Secret): Promise<void> {
    try {
      await cancelAccessRequest.mutateAsync({ projectId, secretId: secret.id })
      setLocallyPendingSecretIds((current) => {
        const next = new Set(current)
        next.delete(secret.id)
        return next
      })
      setLocallyCancelledSecretIds((current) => new Set(current).add(secret.id))
      toast.success('Access request cancelled.')
    } catch (error) {
      toast.error(
        getApiFriendlyMessageWithRef(
          error,
          'Unable to cancel this access request right now. The server did not return a specific reason.'
        )
      )
    }
  }

  async function handleResendAccessRequest(secret: Secret): Promise<void> {
    try {
      await cancelAccessRequest.mutateAsync({ projectId, secretId: secret.id })
    } catch {
      // A stale pending indicator should not block sending a fresh request.
    }

    await handleRequestAccess(secret)
  }

  async function handleDelete(secret: Secret | null): Promise<void> {
    if (!secret) {
      return
    }

    try {
      const result = await deleteSecret.mutateAsync({ projectId, secretId: secret.id })
      setDeleteTarget(null)
      setDeleteImpactTarget(null)
      handleSelect(secret.id, false)
      toast.success(
        result.alreadyDeleted
          ? 'Variable was already deleted. The list has been refreshed.'
          : result.revokedTokenCount
            ? `Variable deleted and ${result.revokedTokenCount} token${result.revokedTokenCount === 1 ? '' : 's'} revoked.`
            : 'Variable deleted.'
      )
    } catch (error) {
      toast.error(
        getApiFriendlyMessageWithRef(
          error,
          'Unable to delete this variable right now. The server did not return a specific reason.'
        )
      )
    }
  }

  async function handleDeleteRequest(secret: Secret | null): Promise<void> {
    if (!secret) {
      return
    }

    const impactedUsers = secretAccessUsers.get(secret.id) ?? []
    if (impactedUsers.length > 0) {
      setDeleteTarget(null)
      setDeleteImpactTarget(secret)
      return
    }

    await handleDelete(secret)
  }

  async function handleBulkDelete(): Promise<void> {
    const targets = selectedSecrets
    if (targets.length === 0) {
      return
    }

    try {
      await Promise.all(
        targets.map((secret) => deleteSecret.mutateAsync({ projectId, secretId: secret.id }))
      )
      setSelectedSecretIds(new Set())
      setIsBulkDeleteOpen(false)
      toast.success(`Deleted ${targets.length} variable${targets.length === 1 ? '' : 's'}.`)
    } catch (error) {
      toast.error(
        getApiFriendlyMessageWithRef(
          error,
          'Unable to delete selected variables right now. The server did not return a specific reason.'
        )
      )
    }
  }

  async function handleCreateChangeRequest(secretNames?: string[]): Promise<void> {
    if (!configId) {
      return
    }

    try {
      await createChangeRequest.mutateAsync({
        sourceConfigId: configId,
        title:
          secretNames && secretNames.length > 0
            ? `Merge ${secretNames.length} selected variable${secretNames.length === 1 ? '' : 's'}`
            : 'Merge branch variables',
        ...(secretNames && secretNames.length > 0 ? { secretNames } : { allKeys: true }),
      })
      setSelectedSecretIds(new Set())
      toast.success('Change request created.')
    } catch (error) {
      toast.error(
        getApiFriendlyMessageWithRef(
          error,
          'Unable to create this change request right now. The server did not return a specific reason.'
        )
      )
    }
  }

  if (secretsQuery.isLoading) {
    return <SecretsListSkeleton />
  }

  if (filtered.length === 0 && !search.trim()) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <Shield className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">No secrets yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add your first environment variable to get started.
        </p>
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
        No matching variables.
      </div>
    )
  }

  return (
    <>
      {canManage && anySelected ? (
        <div className="mb-3 flex items-center gap-3 rounded-md border border-border bg-background-secondary px-3 py-2">
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setSelectedSecretIds(new Set())}
            type="button"
          >
            <X className="h-3.5 w-3.5" />
            Deselect
          </button>
          <span className="text-border">|</span>
          <button
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setSelectedSecretIds(new Set(filtered.map((secret) => secret.id)))}
            type="button"
          >
            Select all
          </button>
          <span className="text-xs text-muted-foreground">{selectedSecretIds.size} selected</span>
          <div className="ml-auto flex gap-2">
            <Button
              className="px-3 text-xs"
              onClick={() => setIsBulkEditOpen(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              Edit values
            </Button>
            {canRequestMerge ? (
              <Button
                className="px-3 text-xs"
                disabled={createChangeRequest.isPending}
                onClick={() =>
                  void handleCreateChangeRequest(selectedSecrets.map((secret) => secret.name))
                }
                size="sm"
                type="button"
                variant="outline"
              >
                Request merge
              </Button>
            ) : null}
            <Button
              className="px-3 text-xs"
              onClick={() => setIsBulkDeleteOpen(true)}
              size="sm"
              type="button"
              variant="danger"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      ) : null}

      {canRequestMerge && filtered.length > 0 && !anySelected ? (
        <div className="mb-3 flex justify-end">
          <Button
            disabled={createChangeRequest.isPending}
            onClick={() => void handleCreateChangeRequest()}
            size="sm"
            type="button"
            variant="outline"
          >
            Request branch merge
          </Button>
        </div>
      ) : null}

      <SpotlightCard className="overflow-hidden border border-border">
        {filtered.map((secret, index) => (
          <SecretRow
            anySelected={anySelected}
            isLast={index === filtered.length - 1}
            isSelected={selectedSecretIds.has(secret.id)}
            key={secret.id}
            canManage={canManage}
            hasAccess={assignedSecretIds.has(secret.id)}
            accessRequestStatus={latestAccessRequestBySecretId.get(secret.id)?.status ?? null}
            accessUserCount={activeUserAccessCounts.get(secret.id) ?? 0}
            showAccessCount={canManage}
            isRequestingAccess={requestingSecretId === secret.id}
            isCancellingRequest={cancelAccessRequest.isPending}
            onDelete={() => setDeleteTarget(secret)}
            onEdit={() => setEditTarget(secret)}
            onHistory={() => setHistoryTarget(secret)}
            onMetadata={() => setMetadataTarget(secret)}
            onCancelRequest={() => void handleCancelAccessRequest(secret)}
            onRequestAccess={() => void handleRequestAccess(secret)}
            onResendRequest={() => void handleResendAccessRequest(secret)}
            onSelect={handleSelect}
            secret={secret}
          />
        ))}
      </SpotlightCard>

      {canManage || editTarget ? (
        <EditSecretDialog
          key={`${Boolean(editTarget) || isBulkEditOpen}:${editTargets.map((secret) => secret.id).join(':')}`}
          onOpenChange={(open) => {
            if (!open) {
              setEditTarget(null)
              setIsBulkEditOpen(false)
            }
          }}
          open={Boolean(editTarget) || isBulkEditOpen}
          projectId={projectId}
          targets={editTargets}
        />
      ) : null}

      <SecretVersionsDialog
        onOpenChange={(open) => {
          if (!open) {
            setHistoryTarget(null)
          }
        }}
        open={Boolean(historyTarget)}
        projectId={projectId}
        secret={historyTarget}
      />

      <SecretMetadataDialog
        key={metadataTarget?.id ?? 'secret-metadata'}
        onOpenChange={(open) => {
          if (!open) {
            setMetadataTarget(null)
          }
        }}
        open={Boolean(metadataTarget)}
        projectId={projectId}
        secret={metadataTarget}
      />

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        open={Boolean(deleteTarget)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the variable and revoke its tokens. This action cannot be
            undone.
            {deleteTargetUsers.length > 0
              ? ` ${deleteTargetUsers.length} project member${deleteTargetUsers.length === 1 ? '' : 's'} currently use this variable.`
              : ''}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSecret.isPending}
              onClick={() => void handleDeleteRequest(deleteTarget)}
            >
              Delete variable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeleteImpactTarget(null)
          }
        }}
        open={Boolean(deleteImpactTarget)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete and revoke access?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                {deleteImpactTarget?.name} is currently assigned to these users. Deleting it will
                revoke their tokens immediately.
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {deleteImpactUsers.map((user) => (
                  <li className="text-sm" key={user.id}>
                    <span className="font-medium text-foreground">{user.name}</span>
                    {user.email ? (
                      <span className="ml-2 text-muted-foreground">{user.email}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSecret.isPending}
              onClick={() => void handleDelete(deleteImpactTarget)}
            >
              Delete and revoke tokens
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog onOpenChange={setIsBulkDeleteOpen} open={isBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete {selectedSecretIds.size} variables?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                This will permanently delete the selected variables and revoke their tokens. This
                action cannot be undone.
              </p>
              {selectedSecrets.some((secret) => (secretAccessUsers.get(secret.id) ?? []).length) ? (
                <p>
                  Some selected variables are currently assigned to project members; their access
                  will be removed too.
                </p>
              ) : null}
            </div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSecret.isPending}
              onClick={() => void handleBulkDelete()}
            >
              Delete {selectedSecretIds.size} variables
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function SecretRow({
  accessRequestStatus,
  anySelected,
  canManage,
  hasAccess,
  isCancellingRequest,
  accessUserCount,
  showAccessCount,
  secret,
  isLast,
  isSelected,
  isRequestingAccess,
  onDelete,
  onEdit,
  onHistory,
  onMetadata,
  onCancelRequest,
  onRequestAccess,
  onResendRequest,
  onSelect,
}: {
  accessRequestStatus: SecretAccessRequestStatus | null
  anySelected: boolean
  canManage: boolean
  hasAccess: boolean
  isCancellingRequest: boolean
  accessUserCount: number
  showAccessCount: boolean
  secret: Secret
  isLast: boolean
  isSelected: boolean
  isRequestingAccess: boolean
  onDelete: () => void
  onEdit: () => void
  onHistory: () => void
  onMetadata: () => void
  onCancelRequest: () => void
  onRequestAccess: () => void
  onResendRequest: () => void
  onSelect: (secretId: string, checked: boolean) => void
}) {
  const [showValue, setShowValue] = useState(false)
  const showCheckbox = canManage && (anySelected || isSelected)
  const canRevealPlaintextValue =
    secret.encryptionMode === 'plaintext' && typeof secret.plaintextValue === 'string'
  const canOpenMenu = canManage

  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-card-elevated',
        isSelected && 'bg-accent/8',
        !isLast && 'border-b border-border'
      )}
    >
      {canManage ? (
        <div
          className={cn(
            'transition-opacity group-hover:opacity-100',
            showCheckbox ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Checkbox
            checked={isSelected}
            onClick={(event) => event.stopPropagation()}
            onCheckedChange={(checked) => onSelect(secret.id, checked)}
          />
        </div>
      ) : null}

      <div
        className={cn(
          'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border border-border',
          secret.encryptionMode === 'plaintext' && 'border-warning/45 bg-warning-muted'
        )}
      >
        {secret.encryptionMode === 'plaintext' ? (
          <Unlock className="h-3.5 w-3.5 text-warning" />
        ) : (
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>

      <div className="grid min-w-0 flex-1 grid-cols-[minmax(10rem,1fr)_6.5rem_7.25rem] items-center gap-3">
        <div className="min-w-0">
          <span className="flex truncate font-mono text-sm items-center gap-3">
            {secret.name}
            <span
              className={cn(
                'text-center font-sans text-[11px]',
                secret.encryptionMode === 'plaintext' ? 'text-warning' : 'text-muted-foreground'
              )}
            >
              {secret.encryptionMode === 'plaintext' ? 'unencrypted' : null}
            </span>
          </span>
          {secret.description || (secret.tags?.length ?? 0) > 0 ? (
            <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              {secret.description ? <span className="truncate">{secret.description}</span> : null}
              {(secret.tags ?? []).slice(0, 2).map((tag) => (
                <span className="rounded border border-border px-1.5 py-0.5" key={tag}>
                  {tag}
                </span>
              ))}
            </span>
          ) : null}
        </div>
        <span className={cn('text-center font-sans text-[11px]', 'text-muted-foreground')}>
          <span className="inline-flex items-center justify-center gap-1" title={secret.folderPath}>
            <FolderTree className="h-3 w-3" />
            {secret.folderPath === '/' || !secret.folderPath
              ? 'root'
              : secret.folderPath.split('/').at(-1)}
          </span>
        </span>
      </div>

      {canManage || hasAccess ? (
        <div className="flex min-w-[17rem] items-center justify-end gap-2">
          <span className="flex w-4 items-center justify-center">
            {canRevealPlaintextValue ? (
              <button
                aria-label={showValue ? `Hide ${secret.name}` : `Show ${secret.name}`}
                className="text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowValue((current) => !current)}
                type="button"
              >
                {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            ) : null}
          </span>
          <span className="font-mono text-sm text-muted-foreground">
            {canRevealPlaintextValue
              ? showValue
                ? secret.plaintextValue
                : '*************'
              : '*************'}
          </span>
          {showAccessCount ? (
            <span className="text-xs text-muted-foreground">
              {accessUserCount} user{accessUserCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
      ) : accessRequestStatus && accessRequestStatus !== 'cancelled' ? (
        <div className="flex min-w-[17rem] justify-end">
          <div className="flex h-8 min-w-[10rem] items-center justify-between rounded-md border border-border bg-background px-3 text-xs text-muted-foreground">
            <span className="capitalize">
              {accessRequestStatus === 'rejected' ? 'Declined' : accessRequestStatus}
            </span>
            {accessRequestStatus === 'pending' ? (
              <span className="ml-3 flex items-center gap-2">
                <button
                  aria-label={`Resend access request for ${secret.name}`}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  disabled={isRequestingAccess}
                  onClick={onResendRequest}
                  type="button"
                >
                  <RotateCw className={cn('h-3.5 w-3.5', isRequestingAccess && 'animate-spin')} />
                </button>
                <button
                  aria-label={`Cancel access request for ${secret.name}`}
                  className="text-muted-foreground transition-colors hover:text-danger"
                  disabled={isCancellingRequest}
                  onClick={onCancelRequest}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <Button
          className="ml-auto h-8 min-w-[10rem] ml-[6rem] justify-center text-xs"
          disabled={isRequestingAccess}
          onClick={onRequestAccess}
          size="sm"
          type="button"
          variant="outline"
        >
          <KeyRound className="mr-1.5 h-3.5 w-3.5" />
          Request access
        </Button>
      )}

      <span className="w-28 text-right text-xs text-muted-foreground">
        {formatRelativeDate(secret.updatedAt)}
      </span>

      <div className="flex w-8 justify-end">
        {canOpenMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-7 w-7 p-0" size="sm" type="button" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>Edit value</DropdownMenuItem>
              <DropdownMenuItem onSelect={onMetadata}>Edit details</DropdownMenuItem>
              {canManage ? (
                <DropdownMenuItem onSelect={onHistory}>Back to older version</DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-danger" onSelect={onDelete}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  )
}

function SecretMetadataDialog({
  onOpenChange,
  open,
  projectId,
  secret,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
  projectId: string
  secret: Secret | null
}) {
  const updateMetadata = useUpdateSecretMetadata()
  const { toast } = useToast()
  const [description, setDescription] = useState(secret?.description ?? '')
  const [folderPath, setFolderPath] = useState(secret?.folderPath ?? '/')
  const [tags, setTags] = useState((secret?.tags ?? []).join(', '))

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!secret) {
      return
    }

    const normalizedTags = parseSecretTagInput(tags)

    try {
      await updateMetadata.mutateAsync({
        projectId,
        secretId: secret.id,
        description: description.trim() || null,
        folderPath: folderPath.trim() || '/',
        tags: normalizedTags,
      })
      toast.success('Variable details updated.')
      onOpenChange(false)
    } catch (error) {
      toast.error(
        getApiFriendlyMessageWithRef(error, "Unable to update this variable's details right now.")
      )
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/45" />
        <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6">
          <DialogTitle className="text-lg font-medium">
            Edit details{secret ? `: ${secret.name}` : ''}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Organize this variable without changing its encrypted value or version history.
          </DialogDescription>

          <form className="mt-5 space-y-4" onSubmit={(event) => void save(event)}>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="metadata-folder-path">
                Folder
              </label>
              <Input
                id="metadata-folder-path"
                maxLength={256}
                onChange={(event) => setFolderPath(event.target.value)}
                placeholder="/services/api"
                value={folderPath}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="metadata-tags">
                Tags
              </label>
              <Input
                id="metadata-tags"
                onChange={(event) => setTags(event.target.value)}
                placeholder="production, database"
                value={tags}
              />
              <p className="text-xs text-muted-foreground">
                Up to 20 comma-separated tags using letters, numbers, dots, underscores, or hyphens.
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="metadata-description">
                Description
              </label>
              <Input
                id="metadata-description"
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe where this variable is used"
                value={description}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => onOpenChange(false)} size="sm" type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={updateMetadata.isPending} size="sm" type="submit">
                {updateMetadata.isPending ? 'Saving...' : 'Save details'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

function SecretVersionsDialog({
  onOpenChange,
  open,
  projectId,
  secret,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
  projectId: string
  secret: Secret | null
}) {
  const versionsQuery = useSecretVersions(projectId, secret?.id ?? null, open && Boolean(secret))
  const restoreVersion = useRestoreSecretVersion()
  const { toast } = useToast()
  const currentVersionId = secret?.currentVersionId ?? null
  const restorableVersions = (versionsQuery.data ?? []).filter(
    (version) =>
      version.id !== currentVersionId &&
      version.state !== 'destroyed' &&
      version.state !== 'compromised'
  )

  async function restore(versionId: string): Promise<void> {
    if (!secret) {
      return
    }

    try {
      await restoreVersion.mutateAsync({
        projectId,
        secretId: secret.id,
        versionId,
      })
      toast.success('Variable restored to the selected version.')
      onOpenChange(false)
    } catch {
      toast.error('Unable to restore this variable version right now.')
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/45" />
        <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5">
          <DialogTitle className="text-lg font-medium">
            Back to older version{secret ? `: ${secret.name}` : ''}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Restoring creates a new active version from the selected encrypted envelope. Older
            versions remain in history for the six month retention window.
          </DialogDescription>

          <div className="mt-4 max-h-96 overflow-auto rounded-md border border-border">
            {versionsQuery.isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading versions...</p>
            ) : restorableVersions.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No previous versions available.</p>
            ) : (
              <div className="divide-y divide-border">
                {restorableVersions.map((version) => (
                  <div
                    className="grid gap-3 px-4 py-3 md:grid-cols-[5rem_minmax(0,1fr)_8rem_auto] md:items-center"
                    key={version.id}
                  >
                    <span className="font-mono text-sm">v{version.versionNumber}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm">{formatVersionSource(version.createdFrom)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateTime(version.createdAt)}
                      </p>
                    </div>
                    <span className="rounded border border-border px-2 py-1 text-center text-xs text-muted-foreground">
                      {version.state}
                    </span>
                    <Button
                      disabled={restoreVersion.isPending}
                      onClick={() => void restore(version.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={() => onOpenChange(false)} size="sm" type="button">
              Close
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

function formatVersionSource(value?: string) {
  switch (value) {
    case 'manual_create':
      return 'Initial version'
    case 'manual_update':
      return 'Manual update'
    case 'restore':
      return 'Restored from older version'
    case 'bootstrap':
      return 'Bootstrap import'
    default:
      return value ?? 'Unknown source'
  }
}

function EditSecretDialog({
  onOpenChange,
  open,
  projectId,
  targets,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
  projectId: string
  targets: Secret[]
}) {
  const updateSecret = useUpdateSecret()
  const { toast } = useToast()
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(targets.map((secret) => [secret.id, '']))
  )
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const updates = targets
      .map((secret) => ({
        secretId: secret.id,
        plaintext: values[secret.id]?.trim() ?? '',
      }))
      .filter((update) => update.plaintext)

    if (updates.length === 0) {
      return
    }

    try {
      await Promise.all(
        updates.map((update) =>
          updateSecret.mutateAsync({
            projectId,
            secretId: update.secretId,
            plaintext: update.plaintext,
          })
        )
      )
      toast.success(`Updated ${updates.length} variable${updates.length === 1 ? '' : 's'}.`)
      onOpenChange(false)
    } catch (error) {
      toast.error(
        getApiFriendlyMessageWithRef(
          error,
          'Unable to update selected variables right now. The server did not return a specific reason.'
        )
      )
    }
  }

  const hasValue = Object.values(values).some((value) => value.trim())

  return (
    <Dialog onOpenChange={onOpenChange} open={open && targets.length > 0}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/45" />
        <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-lg border border-border bg-card p-6">
          <DialogTitle className="text-lg font-medium">
            {targets.length === 1 ? `Edit ${targets[0]?.name}` : `Edit ${targets.length} variables`}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Enter new values. Leave blank to keep the current value unchanged.
          </DialogDescription>

          <form className="space-y-3 pt-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="max-h-[52vh] space-y-3 overflow-y-auto p-1">
              {targets.map((secret) => (
                <div className="space-y-1" key={secret.id}>
                  <label
                    className="font-mono text-xs font-medium text-muted-foreground"
                    htmlFor={`secret-value-${secret.id}`}
                  >
                    {secret.name}
                  </label>
                  <div className="relative">
                    <Input
                      className="pr-9 font-mono text-sm"
                      id={`secret-value-${secret.id}`}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [secret.id]: event.target.value,
                        }))
                      }
                      placeholder="New value (leave blank to keep current)"
                      type={showValues[secret.id] ? 'text' : 'password'}
                      value={values[secret.id] ?? ''}
                    />
                    <button
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() =>
                        setShowValues((current) => ({
                          ...current,
                          [secret.id]: !current[secret.id],
                        }))
                      }
                      type="button"
                    >
                      {showValues[secret.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => onOpenChange(false)} size="sm" type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={!hasValue || updateSecret.isPending} size="sm" type="submit">
                {updateSecret.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

function SecretsListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="h-12 animate-pulse bg-card" />
      <div className="h-12 animate-pulse border-t border-border bg-card" />
      <div className="h-12 animate-pulse border-t border-border bg-card" />
    </div>
  )
}
