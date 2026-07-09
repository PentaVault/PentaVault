'use client'

import { useState } from 'react'

import { MemberAccessDialog } from '@/components/dashboard/token-assignment-view'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useProjectMemberEnvironmentAccess,
  useRemoveProjectMember,
  useReplaceProjectMemberEnvironmentAccess,
  useUpdateProjectMember,
} from '@/lib/hooks/use-team'
import { useToast } from '@/lib/hooks/use-toast'
import type {
  ProjectEnvironment,
  ProjectMembership,
  Secret,
  UserSecretAccess,
} from '@/lib/types/models'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'
import type { PendingSecretRequest } from '@/lib/utils/secret-access-requests'

type TeamMemberRowProps = {
  projectId: string
  membership: ProjectMembership
  assignedCount: number
  canManage: boolean
  currentUserId: string | null
  environments?: ProjectEnvironment[]
  memberAccess?: UserSecretAccess[]
  pendingRequests?: PendingSecretRequest[]
  secrets?: Secret[]
}

type EditableRole = 'admin' | 'member'

function displayProjectRole(role: ProjectMembership['role']): EditableRole {
  return role === 'admin' || role === 'owner' ? 'admin' : 'member'
}

function shortEnvironmentName(name: string): string {
  const normalized = name.trim().toLowerCase()
  if (normalized === 'development') return 'Dev'
  if (normalized === 'staging') return 'Stg'
  if (normalized === 'production') return 'Prd'

  const firstWord = name.trim().split(/\s+/)[0] ?? name
  return firstWord.length > 8 ? `${firstWord.slice(0, 7)}.` : firstWord
}

export function TeamMemberRow({
  assignedCount,
  canManage,
  currentUserId,
  environments = [],
  memberAccess = [],
  projectId,
  membership,
  pendingRequests = [],
  secrets = [],
}: TeamMemberRowProps) {
  const updateMember = useUpdateProjectMember(projectId)
  const removeMember = useRemoveProjectMember(projectId)
  const environmentAccessQuery = useProjectMemberEnvironmentAccess(
    projectId,
    membership.userId,
    membership.role !== 'admin'
  )
  const replaceEnvironmentAccess = useReplaceProjectMemberEnvironmentAccess(projectId)
  const { toast } = useToast()

  const [role, setRole] = useState<EditableRole>(displayProjectRole(membership.role))
  const isOrgDerivedAdmin = membership.grantSource === 'org_owner'
  const isCurrentUser = Boolean(currentUserId) && membership.userId === currentUserId
  const canManageRow = canManage && !isOrgDerivedAdmin && !isCurrentUser
  const canLeaveRow = isCurrentUser && !isOrgDerivedAdmin
  const [isVariableAccessOpen, setIsVariableAccessOpen] = useState(false)
  const canManageVariableAccess = canManageRow && membership.role === 'member' && secrets.length > 0
  const environmentAccessUnavailable = environmentAccessQuery.data?.unavailable === true
  const grantedEnvironmentIds = environmentAccessUnavailable
    ? new Set(environments.map((environment) => environment.id))
    : new Set((environmentAccessQuery.data?.access ?? []).map((access) => access.environmentId))
  const variableLabel =
    membership.role === 'admin'
      ? 'full access'
      : `${assignedCount} variable${assignedCount === 1 ? '' : 's'}`
  const environmentLabel =
    membership.role === 'admin'
      ? 'all environments'
      : environments
          .filter((environment) => grantedEnvironmentIds.has(environment.id))
          .map((environment) => environment.name)
          .join(', ') || 'no environments'

  async function toggleEnvironment(environmentId: string, checked: boolean): Promise<void> {
    const next = new Set(grantedEnvironmentIds)
    if (checked) {
      next.add(environmentId)
    } else {
      next.delete(environmentId)
    }

    try {
      await replaceEnvironmentAccess.mutateAsync({
        userId: membership.userId,
        input: { environmentIds: [...next] },
      })
      toast.success('Environment access updated.')
    } catch (updateError) {
      toast.error(getApiFriendlyMessage(updateError, 'Unable to update environment access.'))
    }
  }

  async function updateRole(nextRole: EditableRole): Promise<void> {
    if (!canManageRow) {
      return
    }

    const previousRole = role
    setRole(nextRole)

    try {
      await updateMember.mutateAsync({
        userId: membership.userId,
        input: { role: nextRole },
      })
      toast.success('Member role updated.')
    } catch (updateError) {
      setRole(previousRole)
      toast.error(getApiFriendlyMessage(updateError, 'Unable to update member role.'))
    }
  }

  async function removeMemberRow(): Promise<void> {
    if (!canManageRow && !canLeaveRow) {
      return
    }

    try {
      await removeMember.mutateAsync(membership.userId)
      toast.success(canLeaveRow ? 'You left this project.' : 'Member removed from project.')
    } catch (removeError) {
      toast.error(getApiFriendlyMessage(removeError, 'Unable to remove member.'))
    }
  }

  return (
    <div
      className={cn(
        'grid gap-3 border-b border-border px-4 py-3 last:border-b-0 md:items-center',
        canManage
          ? 'md:grid-cols-[minmax(0,1fr)_120px_minmax(260px,1fr)_140px_96px]'
          : 'md:grid-cols-[minmax(0,1fr)_120px_minmax(220px,1fr)_minmax(120px,max-content)]'
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium">
            {membership.user?.name ?? membership.userId}
          </p>
          {isCurrentUser ? (
            <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              you
            </span>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {membership.user?.email ?? membership.userId}
        </p>
      </div>

      {canManageVariableAccess ? (
        <button
          className="justify-self-start text-left font-mono text-xs text-muted-foreground transition-colors hover:text-accent md:justify-self-center"
          onClick={() => setIsVariableAccessOpen(true)}
          type="button"
        >
          {variableLabel}
        </button>
      ) : (
        <p className="justify-self-start font-mono text-xs text-muted-foreground md:justify-self-center">
          {variableLabel}
        </p>
      )}

      {membership.role === 'admin' || !canManageRow ? (
        <p className="justify-self-start truncate text-xs text-muted-foreground md:justify-self-center">
          {environmentLabel}
        </p>
      ) : (
        <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap py-1">
          {environments.map((environment) => (
            <label
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"
              key={environment.id}
              title={environment.name}
            >
              <input
                checked={grantedEnvironmentIds.has(environment.id)}
                disabled={replaceEnvironmentAccess.isPending || environmentAccessUnavailable}
                onChange={(event) => void toggleEnvironment(environment.id, event.target.checked)}
                type="checkbox"
              />
              {shortEnvironmentName(environment.name)}
            </label>
          ))}
        </div>
      )}

      {canManageRow ? (
        <>
          <Select
            disabled={updateMember.isPending}
            onValueChange={(value) => void updateRole(value as EditableRole)}
            value={role}
          >
            <SelectTrigger aria-label="Member role">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="admin">admin</SelectItem>
                <SelectItem value="member">member</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Button
            className="justify-self-start md:justify-self-end"
            disabled={removeMember.isPending}
            onClick={() => void removeMemberRow()}
            size="sm"
            type="button"
            variant="danger"
          >
            Remove
          </Button>
        </>
      ) : canLeaveRow ? (
        <div className="flex items-center gap-3 justify-self-start md:justify-self-end">
          <p className="justify-self-start font-mono text-xs text-muted-foreground md:justify-self-center">
            {displayProjectRole(membership.role)}
          </p>
          <Button
            disabled={removeMember.isPending}
            onClick={() => void removeMemberRow()}
            size="sm"
            type="button"
            variant="outline"
          >
            Leave
          </Button>
        </div>
      ) : canManage ? (
        <p className="justify-self-start font-mono text-xs text-muted-foreground md:justify-self-center">
          {displayProjectRole(membership.role)}
        </p>
      ) : null}
      <MemberAccessDialog
        member={membership}
        memberAccess={memberAccess}
        onOpenChange={setIsVariableAccessOpen}
        open={isVariableAccessOpen}
        pendingRequests={pendingRequests}
        projectId={projectId}
        secrets={secrets}
      />
    </div>
  )
}
