'use client'

import {
  Copy,
  Eye,
  EyeOff,
  History,
  MoreHorizontal,
  PauseCircle,
  Play,
  Plus,
  RotateCcw,
  Shield,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getOrgProjectSecretsPath, getProjectSecretsPath } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useCreateSecretAccessRequest } from '@/lib/hooks/use-projects'
import {
  useCancelSecretAccessRequest,
  useGrantSecretAccess,
  useProjectSecretAccess,
  useProjectSecrets,
  useRevokeSecretAccess,
  useSecretAccessRequests,
} from '@/lib/hooks/use-secrets'
import { useProjectMembers } from '@/lib/hooks/use-team'
import { useToast } from '@/lib/hooks/use-toast'
import {
  useGenerateToken,
  useGenerateTokensForMember,
  useProjectTokens,
  useRevokeToken,
} from '@/lib/hooks/use-tokens'
import type { ProjectMembership, ProxyToken, Secret, UserSecretAccess } from '@/lib/types/models'
import { cn } from '@/lib/utils/cn'
import { formatRelativeDate } from '@/lib/utils/format'
import {
  buildSecretAccessExpiry,
  SECRET_ACCESS_DURATIONS,
  type SecretAccessDuration,
} from '@/lib/utils/secret-access-expiry'
import {
  buildPendingSecretRequestsByUserFromRecords,
  type PendingSecretRequest,
} from '@/lib/utils/secret-access-requests'

const PROJECT_MEMBER_ROLES = new Set(['owner', 'admin', 'member'])

type GeneratedToken = {
  secretId: string
  rawToken: string
  tokenStart: string
  createdAt: string
}

function tokenTimestamp(token: ProxyToken): number {
  return new Date(token.createdAt).getTime()
}

function latestTokenForSecret(tokens: ProxyToken[]): ProxyToken[] {
  const bySecretId = new Map<string, ProxyToken>()

  for (const token of tokens) {
    const current = bySecretId.get(token.secretId)
    if (!current || tokenTimestamp(token) > tokenTimestamp(current)) {
      bySecretId.set(token.secretId, token)
    }
  }

  return Array.from(bySecretId.values()).sort((left, right) =>
    left.secretId.localeCompare(right.secretId)
  )
}

function tokenHistoryForSecret(tokens: ProxyToken[], secretId: string): ProxyToken[] {
  return tokens
    .filter((token) => token.secretId === secretId)
    .sort((left, right) => tokenTimestamp(right) - tokenTimestamp(left))
}

export function TokenAssignmentView({
  effectiveRole,
  mode = 'self',
  projectId,
}: {
  effectiveRole?: string | null
  mode?: 'self' | 'manage'
  projectId: string
}) {
  const params = useParams<{ orgId?: string }>()
  const auth = useAuth()
  const currentUserId = auth.session?.user.id ?? null
  const orgId = typeof params.orgId === 'string' ? params.orgId : null
  const secretsHref = orgId
    ? getOrgProjectSecretsPath(orgId, projectId)
    : getProjectSecretsPath(projectId)
  const canManageAssignments =
    mode === 'manage' && (effectiveRole === 'owner' || effectiveRole === 'admin')
  const membersQuery = useProjectMembers(projectId, mode === 'manage')
  const secretsQuery = useProjectSecrets(projectId)
  const secretAccessQuery = useProjectSecretAccess(projectId)
  const tokensQuery = useProjectTokens(projectId, true, mode === 'manage' ? 'all' : 'self')
  const secretAccessRequestsQuery = useSecretAccessRequests(projectId)

  if (
    (mode === 'manage' && membersQuery.isLoading) ||
    secretsQuery.isLoading ||
    secretAccessQuery.isLoading ||
    tokensQuery.isLoading
  ) {
    return <TokenAssignmentSkeleton />
  }

  const sessionUser = auth.session?.user
  const selfRole: ProjectMembership['role'] = PROJECT_MEMBER_ROLES.has(effectiveRole ?? '')
    ? (effectiveRole as ProjectMembership['role'])
    : 'member'
  const selfMember =
    currentUserId && mode === 'self'
      ? ({
          id: `self:${projectId}:${currentUserId}`,
          projectId,
          userId: currentUserId,
          role: selfRole,
          createdAt: new Date(0).toISOString(),
          user: {
            id: currentUserId,
            name: sessionUser?.name ?? sessionUser?.email ?? currentUserId,
            email: sessionUser?.email ?? currentUserId,
            image: sessionUser?.image ?? null,
          },
        } as ProjectMembership)
      : null
  const members =
    mode === 'manage' ? (membersQuery.data?.members ?? []) : selfMember ? [selfMember] : []
  const secrets = secretsQuery.data ?? []
  const tokens = tokensQuery.data ?? []
  const activeTokens = tokens.filter((token) => token.revokedAt === null)
  const activeSecretAccess = (secretAccessQuery.data ?? []).filter(
    (access) => access.status === 'active'
  )
  const pendingRequestsByUserId = buildPendingSecretRequestsByUserFromRecords({
    access: activeSecretAccess,
    requests: secretAccessRequestsQuery.data ?? [],
    secrets,
    tokens: activeTokens,
  })

  if (secrets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <Shield className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">No secrets added yet</p>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">
          Add secrets to this project first, then come back to assign access.
        </p>
        {canManageAssignments ? (
          <Button asChild size="sm" type="button" variant="outline">
            <Link href={secretsHref}>Go to Secrets</Link>
          </Button>
        ) : null}
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
  const visibleMembers = canManageAssignments
    ? orderedMembers
    : currentMember
      ? [currentMember]
      : []

  if (visibleMembers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No variables assigned yet.
      </div>
    )
  }

  if (canManageAssignments) {
    return (
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-4 border-b border-border bg-card-elevated px-4 py-3 text-xs text-muted-foreground">
          <span>Member</span>
          <span>Role</span>
          <span>Variables</span>
        </div>
        <div className="divide-y divide-border">
          {visibleMembers.map((member) => {
            const memberAccess = activeSecretAccess.filter(
              (access) => access.userId === member.userId
            )

            return (
              <MemberAccessSummaryRow
                key={member.userId}
                memberAccess={memberAccess}
                member={member}
                pendingRequests={pendingRequestsByUserId.get(member.userId) ?? []}
                projectId={projectId}
                secrets={secrets}
              />
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {visibleMembers.map((member) => {
        const memberTokens = tokens
          .filter((token) => token.userId === member.userId)
          .sort((left, right) => Number(Boolean(left.revokedAt)) - Number(Boolean(right.revokedAt)))
        const currentMemberTokens = latestTokenForSecret(memberTokens)

        return (
          <MemberAccessSection
            alwaysOpen
            canAddVariables={canManageAssignments}
            canManageTokens={canManageAssignments}
            canRequestVariables={!canManageAssignments}
            key={member.userId}
            memberAccess={activeSecretAccess.filter((access) => access.userId === member.userId)}
            member={member}
            memberTokens={currentMemberTokens}
            pendingRequests={pendingRequestsByUserId.get(member.userId) ?? []}
            projectId={projectId}
            secrets={secrets}
            tokenHistory={memberTokens}
          />
        )
      })}
    </div>
  )
}

function MemberAccessSummaryRow({
  member,
  memberAccess,
  pendingRequests,
  projectId,
  secrets,
}: {
  member: ProjectMembership
  memberAccess: UserSecretAccess[]
  pendingRequests: PendingSecretRequest[]
  projectId: string
  secrets: Secret[]
}) {
  const [open, setOpen] = useState(false)
  const displayName = member.user?.name ?? member.userId
  const email = member.user?.email ?? member.userId
  const count = new Set(memberAccess.map((access) => access.secretId)).size

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={displayName} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{member.role}</span>
        <button
          className="text-right font-mono text-xs text-muted-foreground transition-colors hover:text-accent"
          onClick={() => setOpen(true)}
          type="button"
        >
          {count} variable{count === 1 ? '' : 's'}
        </button>
      </div>

      <MemberAccessDialog
        member={member}
        memberAccess={memberAccess}
        onOpenChange={setOpen}
        open={open}
        pendingRequests={pendingRequests}
        projectId={projectId}
        secrets={secrets}
      />
    </>
  )
}

export function MemberAccessDialog({
  member,
  memberAccess = [],
  onOpenChange,
  open,
  pendingRequests,
  projectId,
  secrets,
}: {
  member: ProjectMembership
  memberAccess?: UserSecretAccess[]
  onOpenChange: (open: boolean) => void
  open: boolean
  pendingRequests: PendingSecretRequest[]
  projectId: string
  secrets: Secret[]
}) {
  const [accessDuration, setAccessDuration] = useState<SecretAccessDuration>('7d')
  const grantSecretAccess = useGrantSecretAccess()
  const revokeSecretAccess = useRevokeSecretAccess()
  const { toast } = useToast()
  const displayName = member.user?.name ?? member.userId
  const assignedSecretIds = useMemo(
    () =>
      new Set(
        memberAccess.filter((access) => access.status === 'active').map((access) => access.secretId)
      ),
    [memberAccess]
  )
  const assignedAccessBySecretId = useMemo(
    () =>
      new Map(
        memberAccess
          .filter((access) => access.status === 'active')
          .map((access) => [access.secretId, access])
      ),
    [memberAccess]
  )
  const pendingSecretIds = useMemo(
    () => new Set(pendingRequests.map((request) => request.secretId)),
    [pendingRequests]
  )

  async function toggleSecret(secret: Secret, checked: boolean): Promise<void> {
    try {
      if (checked) {
        await grantSecretAccess.mutateAsync({
          projectId,
          secretId: secret.id,
          userId: member.userId,
          environmentId: secret.environmentId ?? null,
          expiresAt: buildSecretAccessExpiry(accessDuration),
        })
        toast.success(`Granted access to ${secret.name}.`)
      } else {
        await revokeSecretAccess.mutateAsync({
          projectId,
          secretId: secret.id,
          userId: member.userId,
        })
        toast.success(`Removed access to ${secret.name}.`)
      }
    } catch {
      toast.error(`Unable to update access for ${secret.name}.`)
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/45" />
        <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5">
          <DialogTitle className="text-lg font-medium">
            Variable access for {displayName}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Checked variables are granted to this member. Unchecking a variable revokes access and
            disables active proxy tokens for it.
          </DialogDescription>

          <label
            className="mt-4 block space-y-1.5 text-xs text-muted-foreground"
            htmlFor={`member-access-duration-${member.userId}`}
          >
            New grants expire after
            <Select
              onValueChange={(value: SecretAccessDuration) => setAccessDuration(value)}
              value={accessDuration}
            >
              <SelectTrigger id={`member-access-duration-${member.userId}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECRET_ACCESS_DURATIONS.map((duration) => (
                  <SelectItem key={duration.value} value={duration.value}>
                    {duration.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="mt-4 max-h-80 divide-y divide-border overflow-y-auto rounded-md border border-border">
            {secrets.map((secret) => {
              const isAssigned = assignedSecretIds.has(secret.id)
              const assignedAccess = assignedAccessBySecretId.get(secret.id)
              const isPending = pendingSecretIds.has(secret.id)
              const isBusy = grantSecretAccess.isPending || revokeSecretAccess.isPending

              return (
                <label
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-background-secondary"
                  htmlFor={`member-access-${member.userId}-${secret.id}`}
                  key={secret.id}
                >
                  <Checkbox
                    checked={isAssigned}
                    disabled={isBusy}
                    id={`member-access-${member.userId}-${secret.id}`}
                    onCheckedChange={(checked) => void toggleSecret(secret, Boolean(checked))}
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">{secret.name}</span>
                  {assignedAccess?.expiresAt ? (
                    <span
                      className="text-xs text-muted-foreground"
                      title={assignedAccess.expiresAt}
                    >
                      Expires {formatRelativeDate(assignedAccess.expiresAt)}
                    </span>
                  ) : null}
                  {isPending && !isAssigned ? (
                    <span className="rounded border border-border px-2 py-1 text-xs text-muted-foreground">
                      Pending
                    </span>
                  ) : null}
                </label>
              )
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={() => onOpenChange(false)} size="sm" type="button">
              Done
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

function MemberAccessSection({
  alwaysOpen = false,
  canAddVariables = false,
  canManageTokens = false,
  canRequestVariables = false,
  member,
  memberAccess,
  memberTokens,
  pendingRequests,
  projectId,
  secrets,
  tokenHistory = memberTokens,
}: {
  alwaysOpen?: boolean
  canAddVariables?: boolean
  canManageTokens?: boolean
  canRequestVariables?: boolean
  member: ProjectMembership
  memberAccess: UserSecretAccess[]
  memberTokens: ProxyToken[]
  pendingRequests: PendingSecretRequest[]
  projectId: string
  secrets: Secret[]
  tokenHistory?: ProxyToken[]
}) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [revealTokens, setRevealTokens] = useState<GeneratedToken[] | null>(null)
  const cancelAccessRequest = useCancelSecretAccessRequest()
  const generateToken = useGenerateToken()
  const revokeSecretAccess = useRevokeSecretAccess()
  const { toast } = useToast()
  const assignedSecretIds = useMemo(
    () =>
      new Set(
        memberAccess.filter((access) => access.status === 'active').map((access) => access.secretId)
      ),
    [memberAccess]
  )
  const activeAccessBySecretId = useMemo(
    () =>
      new Map(
        memberAccess
          .filter((access) => access.status === 'active')
          .map((access) => [access.secretId, access])
      ),
    [memberAccess]
  )
  const tokenBySecretId = useMemo(() => {
    return new Map(memberTokens.map((token) => [token.secretId, token]))
  }, [memberTokens])
  const assignedSecrets = useMemo(() => {
    return secrets.filter(
      (secret) => assignedSecretIds.has(secret.id) || (secret.scope ?? 'project') === 'personal'
    )
  }, [assignedSecretIds, secrets])
  const displayName = member.user?.name ?? member.userId
  const email = member.user?.email ?? member.userId

  async function generateSelfToken(secret: Secret): Promise<void> {
    try {
      const response = await generateToken.mutateAsync({
        projectId,
        secretId: secret.id,
        mode: secret.mode,
      })
      setRevealTokens([
        {
          secretId: response.secretId,
          rawToken: response.token,
          tokenStart: response.tokenStart,
          createdAt: new Date().toISOString(),
        },
      ])
    } catch {
      toast.error('Unable to generate a token right now.')
    }
  }

  async function revokeAssignedAccess(secret: Secret): Promise<void> {
    try {
      await revokeSecretAccess.mutateAsync({
        projectId,
        secretId: secret.id,
        userId: member.userId,
      })
      toast.success(`Removed access to ${secret.name}.`)
    } catch {
      toast.error('Unable to remove this access right now.')
    }
  }

  const body = (
    <>
      {assignedSecrets.length > 0 ? (
        <div className="divide-y divide-border">
          {assignedSecrets.map((secret) => {
            const token = tokenBySecretId.get(secret.id)
            const secretAccess = activeAccessBySecretId.get(secret.id)
            const canGenerateForSelfWithoutAssignmentControls =
              canRequestVariables &&
              !canManageTokens &&
              (assignedSecretIds.has(secret.id) || (secret.scope ?? 'project') === 'personal')

            return token ? (
              <AssignedTokenRow
                accessExpiresAt={secretAccess?.expiresAt ?? null}
                canManage={canManageTokens}
                canGenerateSelfToken={!canManageTokens}
                key={secret.id}
                memberId={member.userId}
                onGenerated={setRevealTokens}
                onRevokeAccess={
                  canRequestVariables ? () => void revokeAssignedAccess(secret) : undefined
                }
                projectId={projectId}
                secretName={secret.name}
                token={token}
                tokenHistory={tokenHistoryForSecret(tokenHistory, secret.id)}
              />
            ) : (
              <AssignedSecretRow
                accessExpiresAt={secretAccess?.expiresAt ?? null}
                canGenerate={canManageTokens || canGenerateForSelfWithoutAssignmentControls}
                canRequest={canRequestVariables && !canGenerateForSelfWithoutAssignmentControls}
                key={secret.id}
                onGenerateClick={
                  canManageTokens
                    ? () => setIsAddOpen(true)
                    : canGenerateForSelfWithoutAssignmentControls
                      ? () => void generateSelfToken(secret)
                      : undefined
                }
                onRequestClick={canRequestVariables ? () => setIsAddOpen(true) : undefined}
                onRevokeAccess={
                  canRequestVariables && assignedSecretIds.has(secret.id)
                    ? () => void revokeAssignedAccess(secret)
                    : undefined
                }
                secret={secret}
              />
            )
          })}
        </div>
      ) : (
        <div className="px-4 py-3 text-xs text-muted-foreground">No variables assigned yet.</div>
      )}

      {pendingRequests.length > 0 ? (
        <div className="border-t border-border">
          {pendingRequests.map((request) => (
            <div className="flex items-center gap-4 px-4 py-2.5" key={request.id}>
              <span className="min-w-0 flex-1 truncate font-mono text-sm">
                {request.secretName}
              </span>
              <span className="rounded border border-border px-2 py-1 text-xs text-muted-foreground">
                Pending
              </span>
              <span className="w-28 text-right text-xs text-muted-foreground">
                {formatRelativeDate(request.createdAt)}
              </span>
              <button
                aria-label={`Cancel pending request for ${request.secretName}`}
                className="text-muted-foreground transition-colors hover:text-danger"
                disabled={cancelAccessRequest.isPending}
                onClick={() => {
                  const cancelRequestPayload = canManageTokens
                    ? { projectId, secretId: request.secretId, userId: member.userId }
                    : { projectId, secretId: request.secretId }
                  void cancelAccessRequest
                    .mutateAsync(cancelRequestPayload)
                    .then(() => {
                      toast.success(`Cancelled request for ${request.secretName}`)
                    })
                    .catch(() => {
                      toast.error('Failed to cancel request')
                    })
                }}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

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

      {canRequestVariables ? (
        <div className="border-t border-border px-4 py-2">
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setIsAddOpen(true)}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
            Request variable
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

      {canAddVariables ? (
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
      ) : (
        <RequestVariableAccessDialog
          alreadyAssignedIds={assignedSecretIds}
          memberId={member.userId}
          onOpenChange={setIsAddOpen}
          open={isAddOpen}
          pendingRequests={pendingRequests}
          projectId={projectId}
          secrets={secrets}
        />
      )}

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
  const [accessDuration, setAccessDuration] = useState<SecretAccessDuration>('7d')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const generateTokens = useGenerateTokensForMember()
  const availableSecrets = secrets.filter((secret) => !alreadyAssignedIds.has(secret.id))

  async function handleGenerate(): Promise<void> {
    const response = await generateTokens.mutateAsync({
      projectId,
      secretIds: Array.from(selectedIds),
      userId: memberId,
      expiresAt: buildSecretAccessExpiry(accessDuration),
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

          <label
            className="mt-4 block space-y-1.5 text-xs text-muted-foreground"
            htmlFor={`batch-access-duration-${memberId}`}
          >
            Access expires after
            <Select
              onValueChange={(value: SecretAccessDuration) => setAccessDuration(value)}
              value={accessDuration}
            >
              <SelectTrigger id={`batch-access-duration-${memberId}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECRET_ACCESS_DURATIONS.map((duration) => (
                  <SelectItem key={duration.value} value={duration.value}>
                    {duration.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          {availableSecrets.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              All variables are already assigned.
            </p>
          ) : (
            <div className="mt-4 max-h-72 space-y-1 overflow-y-auto">
              {availableSecrets.map((secret) => (
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-background-secondary"
                  htmlFor={`secret-access-${secret.id}`}
                  key={secret.id}
                >
                  <Checkbox
                    checked={selectedIds.has(secret.id)}
                    id={`secret-access-${secret.id}`}
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

function RequestVariableAccessDialog({
  alreadyAssignedIds,
  onOpenChange,
  open,
  pendingRequests,
  projectId,
  secrets,
}: {
  alreadyAssignedIds: Set<string>
  memberId: string
  onOpenChange: (open: boolean) => void
  open: boolean
  pendingRequests: PendingSecretRequest[]
  projectId: string
  secrets: Secret[]
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const requestAccess = useCreateSecretAccessRequest(projectId)
  const { toast } = useToast()
  const pendingSecretIds = new Set(pendingRequests.map((request) => request.secretId))
  const availableSecrets = secrets.filter(
    (secret) =>
      (secret.scope ?? 'project') === 'project' &&
      !alreadyAssignedIds.has(secret.id) &&
      !pendingSecretIds.has(secret.id)
  )

  async function handleRequest(): Promise<void> {
    try {
      await Promise.all(
        Array.from(selectedIds).map((secretId) => requestAccess.mutateAsync({ secretId }))
      )
      toast.success(`Requested ${selectedIds.size} variable${selectedIds.size === 1 ? '' : 's'}.`)
      setSelectedIds(new Set())
      onOpenChange(false)
    } catch {
      toast.error('Unable to request variable access right now.')
    }
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
          <DialogTitle className="text-lg font-medium">Request variable access</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Select project variables to request from an owner or admin.
          </DialogDescription>

          {availableSecrets.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No more variables are available to request.
            </p>
          ) : (
            <div className="mt-4 max-h-72 space-y-1 overflow-y-auto">
              {availableSecrets.map((secret) => (
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-background-secondary"
                  htmlFor={`secret-request-${secret.id}`}
                  key={secret.id}
                >
                  <Checkbox
                    checked={selectedIds.has(secret.id)}
                    id={`secret-request-${secret.id}`}
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
              disabled={selectedIds.size === 0 || requestAccess.isPending}
              onClick={() => void handleRequest()}
              size="sm"
              type="button"
            >
              {requestAccess.isPending
                ? 'Requesting...'
                : `Request ${selectedIds.size} variable${selectedIds.size === 1 ? '' : 's'}`}
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
  const [showTokens, setShowTokens] = useState(true)
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
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                Tokens generated - save them now
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-warning">
                These tokens will not be shown again. Copy them before closing this dialog.
              </DialogDescription>
            </div>
            <Button
              aria-label={showTokens ? 'Hide generated tokens' : 'Show generated tokens'}
              className="h-8 w-8 p-0"
              onClick={() => setShowTokens((current) => !current)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {showTokens ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
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
                <span className="min-w-0 flex-1 break-all text-foreground">
                  {showTokens ? token.rawToken : `${token.tokenStart}************************`}
                </span>
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

function AssignedSecretRow({
  accessExpiresAt = null,
  canGenerate = false,
  canRequest = false,
  onGenerateClick = undefined,
  onRequestClick = undefined,
  onRevokeAccess = undefined,
  secret,
}: {
  accessExpiresAt?: string | null
  canGenerate?: boolean
  canRequest?: boolean
  onGenerateClick?: (() => void) | undefined
  onRequestClick?: (() => void) | undefined
  onRevokeAccess?: (() => void) | undefined
  secret: Secret
}) {
  return (
    <div className="group flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-card-elevated">
      <span className="min-w-0 flex-1">
        <span className="block break-all font-mono text-sm">{secret.name}</span>
        {accessExpiresAt ? (
          <span className="block text-xs text-muted-foreground" title={accessExpiresAt}>
            Access expires {formatRelativeDate(accessExpiresAt)}
          </span>
        ) : null}
      </span>
      <span className="w-44 truncate font-mono text-xs text-muted-foreground">
        {(secret.scope ?? 'project') === 'personal' ? 'Personal key' : 'No active token'}
      </span>
      <span className="w-28 text-right text-xs text-muted-foreground">
        {formatRelativeDate(secret.updatedAt)}
      </span>
      {canGenerate && onGenerateClick ? (
        <div className="flex w-36 justify-end gap-2">
          <Button
            className="h-6 px-2 text-xs"
            onClick={onGenerateClick}
            size="sm"
            type="button"
            variant="outline"
          >
            Generate token
          </Button>
          {onRevokeAccess ? (
            <Button
              aria-label={`Remove access to ${secret.name}`}
              className="h-6 w-6 p-0"
              onClick={onRevokeAccess}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ) : canRequest && onRequestClick ? (
        <Button
          className="h-6 px-2 text-xs"
          onClick={onRequestClick}
          size="sm"
          type="button"
          variant="outline"
        >
          Request access
        </Button>
      ) : onRevokeAccess ? (
        <Button
          aria-label={`Remove access to ${secret.name}`}
          className="h-6 w-6 p-0"
          onClick={onRevokeAccess}
          size="sm"
          type="button"
          variant="ghost"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <span className="w-28" />
      )}
    </div>
  )
}

function AssignedTokenRow({
  accessExpiresAt,
  canManage,
  canGenerateSelfToken,
  memberId,
  onGenerated,
  onRevokeAccess,
  projectId,
  secretName,
  token,
  tokenHistory,
}: {
  accessExpiresAt: string | null
  canManage: boolean
  canGenerateSelfToken: boolean
  memberId: string
  onGenerated: (tokens: GeneratedToken[]) => void
  onRevokeAccess?: (() => void) | undefined
  projectId: string
  secretName: string
  token: ProxyToken
  tokenHistory: ProxyToken[]
}) {
  const revokeToken = useRevokeToken()
  const generateToken = useGenerateToken()
  const generateTokens = useGenerateTokensForMember()
  const { toast } = useToast()
  const [showToken, setShowToken] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const isPaused = token.revokedAt !== null
  const tokenPreview = token.tokenStart

  async function rotateToken(): Promise<void> {
    try {
      const response = await generateTokens.mutateAsync({
        projectId,
        secretIds: [token.secretId],
        userId: memberId,
      })
      if (!isPaused) {
        await revokeToken.mutateAsync({ projectId, tokenHash: token.tokenHash })
      }
      onGenerated(response.tokens)
    } catch {
      toast.error('Unable to refresh this token right now.')
    }
  }

  async function generateSelfToken(): Promise<void> {
    try {
      const response = await generateToken.mutateAsync({
        projectId,
        secretId: token.secretId,
        mode: token.mode,
      })
      if (!isPaused) {
        await revokeToken.mutateAsync({ projectId, tokenHash: token.tokenHash })
      }
      onGenerated([
        {
          secretId: response.secretId,
          rawToken: response.token,
          tokenStart: response.tokenStart,
          createdAt: new Date().toISOString(),
        },
      ])
    } catch {
      toast.error('Unable to replace this token right now.')
    }
  }

  async function copyTokenReference(): Promise<void> {
    try {
      if (isPaused) {
        toast.error('Paused tokens do not have a usable proxy value.')
        return
      }

      await navigator.clipboard.writeText(`${secretName}=${tokenPreview}`)
      toast.success('Copied token reference.')
    } catch {
      toast.error('Unable to copy token reference.')
    }
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-card-elevated',
        isPaused && 'text-muted-foreground'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block break-all font-mono text-sm">{secretName}</span>
        {accessExpiresAt ? (
          <span className="block text-xs text-muted-foreground" title={accessExpiresAt}>
            Access expires {formatRelativeDate(accessExpiresAt)}
          </span>
        ) : null}
      </span>
      {isPaused ? (
        <span className="w-4" />
      ) : (
        <button
          aria-label={showToken ? `Hide token for ${secretName}` : `Show token for ${secretName}`}
          className="text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setShowToken((current) => !current)}
          type="button"
        >
          {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}
      <span className="w-44 truncate font-mono text-xs text-muted-foreground">
        {isPaused ? 'Paused' : showToken ? tokenPreview : '********'}
      </span>
      <button
        aria-label={`Copy visible token reference for ${secretName}`}
        className="text-muted-foreground transition-colors hover:text-foreground"
        disabled={isPaused}
        onClick={() => void copyTokenReference()}
        type="button"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <span className="w-28 text-right text-xs text-muted-foreground">
        {formatRelativeDate(token.createdAt)}
      </span>
      <TokenActionsMenu
        canManage={canManage}
        canGenerateSelfToken={canGenerateSelfToken}
        generatePending={generateToken.isPending || generateTokens.isPending}
        isPaused={isPaused}
        onGenerateSelf={() => void generateSelfToken()}
        onHistory={() => setHistoryOpen(true)}
        onRemoveAccess={onRevokeAccess}
        onRotate={() => void rotateToken()}
        projectId={projectId}
        revokePending={revokeToken.isPending}
        secretName={secretName}
        tokenHash={token.tokenHash}
      />
      <TokenHistoryDialog
        currentToken={token}
        onMakeCurrent={async (historyToken) => {
          try {
            const historyTokenCreatedAt = tokenTimestamp(historyToken)
            const newerActiveTokens = tokenHistory.filter(
              (candidate) =>
                candidate.revokedAt === null &&
                candidate.tokenHash !== historyToken.tokenHash &&
                tokenTimestamp(candidate) > historyTokenCreatedAt
            )

            await Promise.all(
              newerActiveTokens.map((candidate) =>
                revokeToken.mutateAsync({ projectId, tokenHash: candidate.tokenHash })
              )
            )
            toast.success(`${historyToken.tokenStart} is now the active token reference.`)
            setHistoryOpen(false)
          } catch {
            toast.error('Unable to switch token history right now.')
          }
        }}
        onOpenChange={setHistoryOpen}
        open={historyOpen}
        secretName={secretName}
        tokens={tokenHistory}
      />
    </div>
  )
}

function TokenActionsMenu({
  canManage,
  canGenerateSelfToken,
  generatePending,
  isPaused,
  onGenerateSelf,
  onHistory,
  onRemoveAccess,
  onRotate,
  projectId,
  revokePending,
  secretName,
  tokenHash,
}: {
  canManage: boolean
  canGenerateSelfToken: boolean
  generatePending: boolean
  isPaused: boolean
  onGenerateSelf: () => void
  onHistory: () => void
  onRemoveAccess?: (() => void) | undefined
  onRotate: () => void
  projectId: string
  revokePending: boolean
  secretName: string
  tokenHash: string
}) {
  const revokeToken = useRevokeToken()
  const canReplace = canManage || canGenerateSelfToken

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Token actions for ${secretName}`}
            className="h-7 w-7 p-0"
            size="sm"
            type="button"
            variant="ghost"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canReplace ? (
            <DropdownMenuItem
              disabled={generatePending || revokePending}
              onSelect={canManage ? onRotate : onGenerateSelf}
            >
              {isPaused ? (
                <Play className="mr-2 h-3.5 w-3.5" />
              ) : (
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
              )}
              {isPaused ? 'Reactivate token' : 'New token'}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem disabled={generatePending || revokePending} onSelect={onHistory}>
            <History className="mr-2 h-3.5 w-3.5" />
            Token history
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isPaused ? (
            <DropdownMenuItem
              className="text-danger"
              disabled={revokePending || !onRemoveAccess}
              onSelect={() => onRemoveAccess?.()}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Remove access
            </DropdownMenuItem>
          ) : (
            <>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-warning" disabled={revokePending}>
                  <PauseCircle className="mr-2 h-3.5 w-3.5" />
                  Pause token
                </DropdownMenuItem>
              </AlertDialogTrigger>
              {onRemoveAccess ? (
                <DropdownMenuItem className="text-danger" onSelect={onRemoveAccess}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Remove access
                </DropdownMenuItem>
              ) : null}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogTitle>Pause proxy token for {secretName}?</AlertDialogTitle>
        <AlertDialogDescription>
          This invalidates the current proxy token and keeps the variable in your list as paused.
          You can reactivate it later to generate a fresh proxy token.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={revokePending}
            onClick={() => revokeToken.mutate({ projectId, tokenHash })}
          >
            Pause token
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function TokenHistoryDialog({
  currentToken,
  onMakeCurrent,
  onOpenChange,
  open,
  secretName,
  tokens,
}: {
  currentToken: ProxyToken
  onMakeCurrent: (token: ProxyToken) => Promise<void>
  onOpenChange: (open: boolean) => void
  open: boolean
  secretName: string
  tokens: ProxyToken[]
}) {
  const [pendingTokenHash, setPendingTokenHash] = useState<string | null>(null)

  async function makeCurrent(token: ProxyToken): Promise<void> {
    setPendingTokenHash(token.tokenHash)
    try {
      await onMakeCurrent(token)
    } finally {
      setPendingTokenHash(null)
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/45" />
        <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5">
          <DialogTitle className="text-lg font-medium">Token history for {secretName}</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Raw token values are shown only when created. Older active token references can be made
            current; paused tokens cannot be restored.
          </DialogDescription>

          <div className="mt-4 max-h-80 divide-y divide-border overflow-y-auto rounded-md border border-border">
            {tokens.map((token) => {
              const isCurrent = token.tokenHash === currentToken.tokenHash
              const isPaused = Boolean(token.revokedAt)
              const canMakeCurrent = !isCurrent && !isPaused

              return (
                <div
                  className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_6rem_auto] md:items-center"
                  key={token.tokenHash}
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm">{token.tokenStart}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatRelativeDate(token.createdAt)}
                    </p>
                  </div>
                  <span className="rounded border border-border px-2 py-1 text-center text-xs text-muted-foreground">
                    {isCurrent ? 'current' : isPaused ? 'paused' : 'active'}
                  </span>
                  <Button
                    disabled={!canMakeCurrent || pendingTokenHash === token.tokenHash}
                    onClick={() => void makeCurrent(token)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Make current
                  </Button>
                </div>
              )
            })}
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
