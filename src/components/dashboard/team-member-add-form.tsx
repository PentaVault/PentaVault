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
import { cn } from '@/lib/utils/cn'
import { getApiFieldErrors, getApiFriendlyMessageWithRef } from '@/lib/utils/errors'

type TeamMemberAddFormProps = {
  projectId: string
}

export function TeamMemberAddForm({ projectId }: TeamMemberAddFormProps) {
  const addMember = useAddProjectMember(projectId)
  const { toast } = useToast()

  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})

    const normalizedUserId = userId.trim()
    if (!normalizedUserId) {
      setFieldErrors({ userId: 'Please enter the user ID you want to add.' })
      return
    }

    try {
      await addMember.mutateAsync({ userId: normalizedUserId, role })
      toast.success('Member added successfully.')
      setUserId('')
    } catch (submitError) {
      const fields = getApiFieldErrors(submitError)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        return
      }

      const message = getApiFriendlyMessageWithRef(
        submitError,
        'Unable to add this team member right now.'
      )
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
          className={cn(fieldErrors.userId && 'border-danger focus-visible:ring-danger')}
          id="member-user-id"
          onChange={(event) => {
            setUserId(event.target.value)
            setFieldErrors((current) => ({ ...current, userId: '' }))
          }}
          placeholder="user_xxxxx"
          value={userId}
        />
        {fieldErrors.userId ? <p className="text-sm text-danger">{fieldErrors.userId}</p> : null}
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

      <Button disabled={addMember.isPending} type="submit" variant="outline">
        {addMember.isPending ? 'Adding...' : 'Add member'}
      </Button>

      <p className="text-xs text-muted-foreground">
        Owner role cannot be assigned from this form and must remain immutable.
      </p>
    </form>
  )
}
