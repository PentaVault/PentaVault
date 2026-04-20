'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAddProjectMember } from '@/lib/hooks/use-team'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type TeamMemberAddFormProps = {
  projectId: string
}

export function TeamMemberAddForm({ projectId }: TeamMemberAddFormProps) {
  const addMember = useAddProjectMember(projectId)
  const { toast } = useToast()

  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    const normalizedUserId = userId.trim()
    if (!normalizedUserId) {
      setError('User ID is required.')
      return
    }

    try {
      await addMember.mutateAsync({ userId: normalizedUserId, role })
      toast.success('Member added successfully.')
      setUserId('')
    } catch (submitError) {
      const message = getApiFriendlyMessage(submitError, 'Unable to add member right now.')
      setError(message)
      toast.error(message)
    }
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="member-user-id"
        >
          User ID
        </label>
        <Input
          id="member-user-id"
          onChange={(event) => setUserId(event.target.value)}
          placeholder="user_xxxxx"
          value={userId}
        />
      </div>

      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="member-role"
        >
          Role
        </label>
        <Select onValueChange={(value) => setRole(value as 'admin' | 'member')} value={role}>
          <SelectTrigger aria-label="Member role" id="member-role">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="member">member</SelectItem>
              <SelectItem value="admin">admin</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button disabled={addMember.isPending} type="submit" variant="outline">
        {addMember.isPending ? 'Adding...' : 'Add member'}
      </Button>

      <p className="text-xs text-muted-foreground">
        Owner role cannot be assigned from this form and must remain immutable.
      </p>
    </form>
  )
}
