'use client'

import { useState } from 'react'

import { StatusBadge } from '@/components/ui/badge'
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
}

export function TeamMemberRow({ projectId, membership }: TeamMemberRowProps) {
  const updateMember = useUpdateProjectMember(projectId)
  const removeMember = useRemoveProjectMember(projectId)
  const { toast } = useToast()

  const [role, setRole] = useState<'owner' | 'admin' | 'member'>(membership.role)

  async function saveRole(): Promise<void> {
    if (role === 'owner') {
      return
    }

    try {
      await updateMember.mutateAsync({
        userId: membership.userId,
        input: { role },
      })
      toast.success('Member role updated.')
    } catch (updateError) {
      setRole(membership.role)
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
    <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_170px_180px] sm:items-center">
      <div>
        <p className="text-sm font-medium">{membership.userId}</p>
        <p className="text-xs text-muted-foreground">membership id: {membership.id}</p>
        <div className="mt-1">
          <StatusBadge tone={membership.role === 'owner' ? 'warning' : 'neutral'}>
            {membership.role}
          </StatusBadge>
        </div>
      </div>

      <Select
        disabled={membership.role === 'owner'}
        onValueChange={(value) => setRole(value as 'owner' | 'admin' | 'member')}
        value={role}
      >
        <SelectTrigger aria-label="Member role">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="owner">owner</SelectItem>
            <SelectItem value="admin">admin</SelectItem>
            <SelectItem value="member">member</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Button onClick={() => void saveRole()} size="sm" type="button" variant="outline">
          Save role
        </Button>
        <Button
          onClick={() => void removeMemberRow()}
          size="sm"
          type="button"
          variant="danger"
          disabled={membership.role === 'owner'}
        >
          Remove
        </Button>
      </div>
    </div>
  )
}
