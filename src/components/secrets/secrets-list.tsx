'use client'

import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { Code2, Eye, EyeOff, MoreHorizontal, Shield, Trash2, X } from 'lucide-react'

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
import { useDeleteSecret, useProjectSecrets, useUpdateSecret } from '@/lib/hooks/use-secrets'
import { useProjectMembers } from '@/lib/hooks/use-team'
import { useToast } from '@/lib/hooks/use-toast'
import { useProjectTokens } from '@/lib/hooks/use-tokens'
import type { Secret } from '@/lib/types/models'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'
import { formatRelativeDate } from '@/lib/utils/format'

export function SecretsList({ projectId, search }: { projectId: string; search: string }) {
  const secretsQuery = useProjectSecrets(projectId)
  const tokensQuery = useProjectTokens(projectId)
  const membersQuery = useProjectMembers(projectId)
  const deleteSecret = useDeleteSecret()
  const { toast } = useToast()

  const [selectedSecretIds, setSelectedSecretIds] = useState<Set<string>>(new Set())
  const [editTarget, setEditTarget] = useState<Secret | null>(null)
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Secret | null>(null)
  const [deleteImpactTarget, setDeleteImpactTarget] = useState<Secret | null>(null)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  const secrets = useMemo(() => secretsQuery.data ?? [], [secretsQuery.data])
  const membersByUserId = useMemo(() => {
    return new Map((membersQuery.data?.members ?? []).map((member) => [member.userId, member]))
  }, [membersQuery.data?.members])
  const secretAccessUsers = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string; email: string | null }>>()
    const seen = new Set<string>()

    for (const token of tokensQuery.data ?? []) {
      if (token.revokedAt || !token.userId) {
        continue
      }

      const key = `${token.secretId}:${token.userId}`
      if (seen.has(key)) {
        continue
      }

      seen.add(key)
      const member = membersByUserId.get(token.userId)
      const name = member?.user?.name ?? member?.user?.email ?? token.userId
      const email = member?.user?.email ?? null
      const users = map.get(token.secretId) ?? []
      users.push({ id: token.userId, name, email })
      map.set(token.secretId, users)
    }

    return map
  }, [membersByUserId, tokensQuery.data])
  const filtered = useMemo(() => {
    if (!search.trim()) {
      return secrets
    }

    const query = search.toLowerCase()
    return secrets.filter((secret) => secret.name.toLowerCase().includes(query))
  }, [secrets, search])

  const anySelected = selectedSecretIds.size > 0
  const selectedSecrets = filtered.filter((secret) => selectedSecretIds.has(secret.id))
  const editTargets = editTarget ? [editTarget] : selectedSecrets
  const deleteTargetUsers = deleteTarget ? (secretAccessUsers.get(deleteTarget.id) ?? []) : []
  const deleteImpactUsers = deleteImpactTarget
    ? (secretAccessUsers.get(deleteImpactTarget.id) ?? [])
    : []

  function handleSelect(secretId: string, checked: boolean): void {
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
        result.revokedTokenCount
          ? `Variable deleted and ${result.revokedTokenCount} token${result.revokedTokenCount === 1 ? '' : 's'} revoked.`
          : 'Variable deleted.'
      )
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to delete this variable right now.'))
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
      toast.error(getApiFriendlyMessage(error, 'Unable to delete selected variables right now.'))
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
      {anySelected ? (
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

      <div className="overflow-hidden rounded-lg border border-border">
        {filtered.map((secret, index) => (
          <SecretRow
            anySelected={anySelected}
            isLast={index === filtered.length - 1}
            isSelected={selectedSecretIds.has(secret.id)}
            key={secret.id}
            onDelete={() => setDeleteTarget(secret)}
            onEdit={() => setEditTarget(secret)}
            onSelect={handleSelect}
            secret={secret}
          />
        ))}
      </div>

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
  anySelected,
  secret,
  isLast,
  isSelected,
  onDelete,
  onEdit,
  onSelect,
}: {
  anySelected: boolean
  secret: Secret
  isLast: boolean
  isSelected: boolean
  onDelete: () => void
  onEdit: () => void
  onSelect: (secretId: string, checked: boolean) => void
}) {
  const [showValue, setShowValue] = useState(false)
  const [hovered, setHovered] = useState(false)
  const showCheckbox = hovered || anySelected || isSelected

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-card-elevated',
        isSelected && 'bg-accent/8',
        !isLast && 'border-b border-border'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={cn('transition-opacity', showCheckbox ? 'opacity-100' : 'opacity-0')}
        onClick={(event) => event.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(secret.id, checked)}
        />
      </div>

      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border border-border">
        <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <span className="min-w-0 flex-1 truncate font-mono text-sm">{secret.name}</span>

      <div className="flex items-center gap-2">
        <button
          className="text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setShowValue((current) => !current)}
          type="button"
        >
          {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <span className="font-mono text-sm text-muted-foreground">
          {showValue ? '(value hidden - edit to update)' : '*************'}
        </span>
      </div>

      <span className="w-28 text-right text-xs text-muted-foreground">
        {formatRelativeDate(secret.updatedAt)}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="h-7 w-7 p-0" size="sm" type="button" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>Edit value</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-danger" onSelect={onDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
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
      toast.error(getApiFriendlyMessage(error, 'Unable to update selected variables right now.'))
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
                  <label className="font-mono text-xs font-medium text-muted-foreground">
                    {secret.name}
                  </label>
                  <div className="relative">
                    <Input
                      className="pr-9 font-mono text-sm"
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
