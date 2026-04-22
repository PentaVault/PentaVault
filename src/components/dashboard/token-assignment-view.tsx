'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { ChevronDown, Copy, Plus, RotateCcw, Shield, ShieldCheck, Trash2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
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
import { getProjectSecretsPath } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useProjectSecrets } from '@/lib/hooks/use-secrets'
import { useProjectMembers } from '@/lib/hooks/use-team'
import { useToast } from '@/lib/hooks/use-toast'
import {
  useGenerateTokensForMember,
  useProjectTokens,
  useRevokeToken,
} from '@/lib/hooks/use-tokens'
import type { ProjectMembership, ProxyToken, Secret } from '@/lib/types/models'
import { cn } from '@/lib/utils/cn'
import { formatRelativeDate } from '@/lib/utils/format'

type GeneratedToken = {
  secretId: string
  rawToken: string
  tokenStart: string
  createdAt: string
}

export function TokenAssignmentView({ projectId }: { projectId: string }) {
  const auth = useAuth()
  const currentUserId = auth.session?.user.id ?? null
  const membersQuery = useProjectMembers(projectId)
  const secretsQuery = useProjectSecrets(projectId)
  const tokensQuery = useProjectTokens(projectId)

  if (membersQuery.isLoading || secretsQuery.isLoading || tokensQuery.isLoading) {
    return <TokenAssignmentSkeleton />
  }

  const members = membersQuery.data?.members ?? []
  const secrets = secretsQuery.data ?? []
  const tokens = tokensQuery.data ?? []

  if (secrets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <Shield className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">No secrets added yet</p>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">
          Add secrets to this project first, then come back to assign access.
        </p>
        <Button asChild size="sm" type="button" variant="outline">
          <Link href={getProjectSecretsPath(projectId)}>Go to Secrets</Link>
        </Button>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No project members yet.
      </div>
    )
  }

  const currentMember = currentUserId
    ? members.find((member) => member.userId === currentUserId)
    : undefined
  const otherMembers = currentUserId
    ? members.filter((member) => member.userId !== currentUserId)
    : members
  const orderedMembers = currentMember ? [currentMember, ...otherMembers] : otherMembers
  const currentUserRole = currentMember?.role
  const multipleMembers = members.length > 1

  return (
    <div className="space-y-3">
      {orderedMembers.map((member) => {
        const isCurrentUser = member.userId === currentUserId
        const memberTokens = tokens.filter((token) => token.userId === member.userId)

        if (multipleMembers && !isCurrentUser) {
          return (
            <MemberAccordion
              currentUserRole={currentUserRole}
              key={member.userId}
              member={member}
              memberTokens={memberTokens}
              projectId={projectId}
              secrets={secrets}
            />
          )
        }

        return (
          <MemberAccessSection
            alwaysOpen
            key={member.userId}
            member={member}
            memberTokens={memberTokens}
            projectId={projectId}
            secrets={secrets}
          />
        )
      })}
    </div>
  )
}

function MemberAccordion({
  currentUserRole,
  member,
  memberTokens,
  projectId,
  secrets,
}: {
  currentUserRole: ProjectMembership['role'] | undefined
  member: ProjectMembership
  memberTokens: ProxyToken[]
  projectId: string
  secrets: Secret[]
}) {
  const [open, setOpen] = useState(false)
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'
  const displayName = member.user?.name ?? member.userId
  const email = member.user?.email ?? member.userId

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        className="flex w-full items-center gap-3 bg-card-elevated px-4 py-3 text-left transition-colors hover:bg-card-elevated/80"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Avatar name={displayName} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">{member.role}</span>
          <span className="text-xs text-muted-foreground">
            {memberTokens.length} variable{memberTokens.length === 1 ? '' : 's'}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              open && 'rotate-180'
            )}
          />
        </div>
      </button>

      {open ? (
        <MemberAccessSection
          canAddVariables={canManage}
          member={member}
          memberTokens={memberTokens}
          projectId={projectId}
          secrets={secrets}
        />
      ) : null}
    </div>
  )
}

function MemberAccessSection({
  alwaysOpen = false,
  canAddVariables = true,
  member,
  memberTokens,
  projectId,
  secrets,
}: {
  alwaysOpen?: boolean
  canAddVariables?: boolean
  member: ProjectMembership
  memberTokens: ProxyToken[]
  projectId: string
  secrets: Secret[]
}) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [revealTokens, setRevealTokens] = useState<GeneratedToken[] | null>(null)
  const assignedSecretIds = useMemo(
    () => new Set(memberTokens.map((token) => token.secretId)),
    [memberTokens]
  )
  const displayName = member.user?.name ?? member.userId
  const email = member.user?.email ?? member.userId

  const body = (
    <>
      {memberTokens.length > 0 ? (
        <div className="divide-y divide-border">
          {memberTokens.map((token) => (
            <AssignedTokenRow
              key={token.tokenHash}
              memberId={member.userId}
              onGenerated={setRevealTokens}
              projectId={projectId}
              secretName={secrets.find((secret) => secret.id === token.secretId)?.name ?? 'Unknown'}
              token={token}
            />
          ))}
        </div>
      ) : (
        <div className="px-4 py-3 text-xs text-muted-foreground">No variables assigned yet.</div>
      )}

      {canAddVariables ? (
        <div className="border-t border-border px-4 py-2">
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setIsAddOpen(true)}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
            Add variable
          </button>
        </div>
      ) : null}
    </>
  )

  return (
    <>
      {alwaysOpen ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center gap-3 border-b border-border bg-card-elevated px-4 py-3">
            <Avatar name={displayName} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <span className="ml-auto font-mono text-xs text-muted-foreground">{member.role}</span>
          </div>
          {body}
        </div>
      ) : (
        body
      )}

      <AddVariableAccessDialog
        alreadyAssignedIds={assignedSecretIds}
        memberId={member.userId}
        onGenerated={(tokens) => {
          setIsAddOpen(false)
          setRevealTokens(tokens)
        }}
        onOpenChange={setIsAddOpen}
        open={isAddOpen}
        projectId={projectId}
        secrets={secrets}
      />

      {revealTokens ? (
        <TokenRevealDialog
          onClose={() => setRevealTokens(null)}
          secrets={secrets}
          tokens={revealTokens}
        />
      ) : null}
    </>
  )
}

function AddVariableAccessDialog({
  alreadyAssignedIds,
  memberId,
  onGenerated,
  onOpenChange,
  open,
  projectId,
  secrets,
}: {
  alreadyAssignedIds: Set<string>
  memberId: string
  onGenerated: (tokens: GeneratedToken[]) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  projectId: string
  secrets: Secret[]
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const generateTokens = useGenerateTokensForMember()
  const availableSecrets = secrets.filter((secret) => !alreadyAssignedIds.has(secret.id))

  async function handleGenerate(): Promise<void> {
    const response = await generateTokens.mutateAsync({
      projectId,
      secretIds: Array.from(selectedIds),
      userId: memberId,
    })
    setSelectedIds(new Set())
    onGenerated(response.tokens)
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          setSelectedIds(new Set())
        }
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/45" />
        <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5">
          <DialogTitle className="text-lg font-medium">Add variable access</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Select which variables to grant access to. Tokens will be generated after confirmation.
          </DialogDescription>

          {availableSecrets.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              All variables are already assigned.
            </p>
          ) : (
            <div className="mt-4 max-h-72 space-y-1 overflow-y-auto">
              {availableSecrets.map((secret) => (
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-background-secondary"
                  key={secret.id}
                >
                  <Checkbox
                    checked={selectedIds.has(secret.id)}
                    onCheckedChange={(checked) =>
                      setSelectedIds((current) => {
                        const next = new Set(current)
                        if (checked) {
                          next.add(secret.id)
                        } else {
                          next.delete(secret.id)
                        }
                        return next
                      })
                    }
                  />
                  <span className="font-mono text-sm">{secret.name}</span>
                </label>
              ))}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => onOpenChange(false)} size="sm" type="button" variant="outline">
              Cancel
            </Button>
            <Button
              disabled={selectedIds.size === 0 || generateTokens.isPending}
              onClick={() => void handleGenerate()}
              size="sm"
              type="button"
            >
              {generateTokens.isPending
                ? 'Generating...'
                : `Grant access to ${selectedIds.size} variable${selectedIds.size === 1 ? '' : 's'}`}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

function TokenRevealDialog({
  onClose,
  secrets,
  tokens,
}: {
  onClose: () => void
  secrets: Secret[]
  tokens: GeneratedToken[]
}) {
  const secretMap = new Map(secrets.map((secret) => [secret.id, secret.name]))
  const { toast } = useToast()
  const envText = tokens
    .map((token) => `${secretMap.get(token.secretId) ?? 'UNKNOWN'}=${token.rawToken}`)
    .join('\n')

  async function copyText(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Copied to clipboard.')
    } catch {
      toast.error('Unable to copy to clipboard.')
    }
  }

  return (
    <Dialog onOpenChange={() => undefined} open>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/45" />
        <DialogContent
          className="fixed top-1/2 left-1/2 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg font-medium">
                <ShieldCheck className="h-5 w-5 text-accent" />
                Tokens generated - save them now
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-warning">
                These tokens will not be shown again. Copy them before closing this dialog.
              </DialogDescription>
            </div>
            <Button
              aria-label="Copy all generated tokens"
              className="h-8 w-8 p-0"
              onClick={() => void copyText(envText)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-md border border-border bg-background-secondary p-3 font-mono text-xs">
            {tokens.map((token) => (
              <div className="flex items-start justify-between gap-2" key={token.rawToken}>
                <span className="text-muted-foreground">
                  {secretMap.get(token.secretId) ?? '?'}=
                </span>
                <span className="min-w-0 flex-1 break-all text-foreground">{token.rawToken}</span>
                <button
                  aria-label={`Copy token for ${secretMap.get(token.secretId) ?? 'variable'}`}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() =>
                    void copyText(`${secretMap.get(token.secretId) ?? 'UNKNOWN'}=${token.rawToken}`)
                  }
                  type="button"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={onClose} size="sm" type="button">
              Close
            </Button>
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Use these proxy tokens in your <code>.env</code> file instead of real secrets.
          </p>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

function AssignedTokenRow({
  memberId,
  onGenerated,
  projectId,
  secretName,
  token,
}: {
  memberId: string
  onGenerated: (tokens: GeneratedToken[]) => void
  projectId: string
  secretName: string
  token: ProxyToken
}) {
  const revokeToken = useRevokeToken()
  const generateTokens = useGenerateTokensForMember()
  const { toast } = useToast()

  async function rotateToken(): Promise<void> {
    try {
      const response = await generateTokens.mutateAsync({
        projectId,
        secretIds: [token.secretId],
        userId: memberId,
      })
      await revokeToken.mutateAsync({ projectId, tokenHash: token.tokenHash })
      onGenerated(response.tokens)
    } catch {
      toast.error('Unable to refresh this token right now.')
    }
  }

  return (
    <div className="group flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-card-elevated">
      <span className="min-w-0 flex-1 truncate font-mono text-sm">{secretName}</span>
      <span className="font-mono text-xs text-muted-foreground">****** {token.tokenStart}</span>
      <span className="w-28 text-right text-xs text-muted-foreground">
        {formatRelativeDate(token.createdAt)}
      </span>
      <button
        aria-label={`Refresh token for ${secretName}`}
        className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground disabled:opacity-40 group-hover:opacity-100"
        disabled={generateTokens.isPending || revokeToken.isPending}
        onClick={() => void rotateToken()}
        type="button"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            className="text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Revoke token for {secretName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This token will stop working immediately. A new token can be generated later.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={revokeToken.isPending}
              onClick={() => revokeToken.mutate({ projectId, tokenHash: token.tokenHash })}
            >
              Revoke token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-background-elevated text-xs font-medium">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  )
}

function TokenAssignmentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 animate-pulse rounded-lg border border-border bg-card" />
      <div className="h-32 animate-pulse rounded-lg border border-border bg-card" />
    </div>
  )
}
