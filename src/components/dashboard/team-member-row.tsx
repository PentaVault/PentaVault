'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRemoveProjectMember, useUpdateProjectMember } from '@/lib/hooks/use-team'
import { useToast } from '@/lib/hooks/use-toast'
import type { ProjectMembership } from '@/lib/types/models'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type TeamMemberRowProps = {
  projectId: string
  membership: ProjectMembership
  assignedCount: number
}

type EditableRole = 'admin' | 'member'

function displayProjectRole(role: ProjectMembership['role']): 'owner' | EditableRole {
  return role === 'owner' || role === 'admin' ? role : 'member'
}

export function TeamMemberRow({ assignedCount, projectId, membership }: TeamMemberRowProps) {
  const updateMember = useUpdateProjectMember(projectId)
  const removeMember = useRemoveProjectMember(projectId)
  const { toast } = useToast()

  const [role, setRole] = useState<'owner' | EditableRole>(displayProjectRole(membership.role))

  async function updateRole(nextRole: EditableRole): Promise<void> {
    if (membership.role === 'owner') {
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
    if (membership.role === 'owner') {
      return
    }

    try {
      await removeMember.mutateAsync(membership.userId)
      toast.success('Member removed from project.')
    } catch (removeError) {
      toast.error(getApiFriendlyMessage(removeError, 'Unable to remove member.'))
    }
  }

  return (
    <div className="grid gap-3 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_150px_160px_96px] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{membership.user?.name ?? membership.userId}</p>
        <p className="truncate text-xs text-muted-foreground">
          {membership.user?.email ?? membership.userId}
        </p>
      </div>

      <p className="justify-self-start font-mono text-xs text-muted-foreground md:justify-self-center">
        {assignedCount} variable{assignedCount === 1 ? '' : 's'}
      </p>

      <Select
        disabled={membership.role === 'owner' || updateMember.isPending}
        onValueChange={(value) => void updateRole(value as EditableRole)}
        value={role}
      >
        <SelectTrigger aria-label="Member role">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem disabled value="owner">
              owner
            </SelectItem>
            <SelectItem value="admin">admin</SelectItem>
            <SelectItem value="member">member</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      <Button
        className="justify-self-start md:justify-self-end"
        disabled={membership.role === 'owner' || removeMember.isPending}
        onClick={() => void removeMemberRow()}
        size="sm"
        type="button"
        variant="danger"
      >
        Remove
      </Button>
    </div>
  )
}
