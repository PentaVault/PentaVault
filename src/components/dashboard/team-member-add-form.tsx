'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Plus, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAddProjectMember, useOrganizationMembers } from '@/lib/hooks/use-team'
import { useToast } from '@/lib/hooks/use-toast'
import type { AuthOrganizationMember } from '@/lib/types/auth'
import { cn } from '@/lib/utils/cn'
import { getApiFieldErrors, getApiFriendlyMessageWithRef } from '@/lib/utils/errors'

type TeamMemberAddFormProps = {
  existingUserIds: Set<string>
  organizationId: string | null
  projectId: string
}

export function TeamMemberAddForm({
  existingUserIds,
  organizationId,
  projectId,
}: TeamMemberAddFormProps) {
  const addMember = useAddProjectMember(projectId)
  const organizationMembersQuery = useOrganizationMembers(organizationId)
  const { toast } = useToast()
  const userPickerRef = useRef<HTMLDivElement>(null)

  const [selectedUser, setSelectedUser] = useState<AuthOrganizationMember | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false)
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isUserPickerOpen) {
      return undefined
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!userPickerRef.current?.contains(event.target as Node)) {
        setIsUserPickerOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isUserPickerOpen])

  const availableMembers = useMemo(() => {
    const query = userSearch.trim().toLowerCase()
    return (organizationMembersQuery.data?.members ?? [])
      .filter((member) => !existingUserIds.has(member.user.id))
      .filter((member) => {
        if (!query) {
          return true
        }

        return (
          member.user.name?.toLowerCase().includes(query) ||
          member.user.email?.toLowerCase().includes(query) ||
          member.user.id.toLowerCase().includes(query)
        )
      })
  }, [existingUserIds, organizationMembersQuery.data?.members, userSearch])

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})

    if (!selectedUser) {
      setFieldErrors({ userId: 'Select an organisation member.' })
      return
    }

    try {
      await addMember.mutateAsync({ userId: selectedUser.user.id, role })
      toast.success('Member added successfully.')
      setSelectedUser(null)
      setUserSearch('')
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
    <form className="space-y-2" onSubmit={(event) => void handleSubmit(event)}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
        <div className="relative min-w-0 flex-1" ref={userPickerRef}>
          <button
            className={cn(
              'flex h-9 w-full items-center gap-2 rounded-md border border-border bg-background-elevated px-3 text-left text-sm outline-none transition-colors hover:border-border-strong',
              fieldErrors.userId && 'border-danger'
            )}
            onClick={() => setIsUserPickerOpen((current) => !current)}
            type="button"
          >
            <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className={cn('truncate', !selectedUser && 'text-muted-foreground')}>
              {selectedUser
                ? (selectedUser.user.name ?? selectedUser.user.email ?? selectedUser.user.id)
                : 'Search organisation members...'}
            </span>
          </button>

          {isUserPickerOpen ? (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card p-2">
              <input
                autoFocus
                className="h-8 w-full rounded-md border border-border bg-background-elevated px-2 text-sm outline-none focus:border-border-strong focus:ring-2 focus:ring-focus-ring"
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search by name or email"
                value={userSearch}
              />
              <div className="mt-2 max-h-56 overflow-y-auto">
                {organizationMembersQuery.isLoading ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">Loading members...</p>
                ) : availableMembers.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    No available organisation members.
                  </p>
                ) : (
                  availableMembers.map((member) => (
                    <button
                      className="flex w-full flex-col rounded-md px-2 py-2 text-left transition-colors hover:bg-card-elevated"
                      key={member.user.id}
                      onClick={() => {
                        setSelectedUser(member)
                        setUserSearch('')
                        setIsUserPickerOpen(false)
                        setFieldErrors((current) => ({ ...current, userId: '' }))
                      }}
                      type="button"
                    >
                      <span className="truncate text-sm">{member.user.name ?? member.user.id}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {member.user.email ?? member.user.id}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        <Select onValueChange={(value) => setRole(value as 'admin' | 'member')} value={role}>
          <SelectTrigger aria-label="Member role" className="lg:w-36">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="member">member</SelectItem>
              <SelectItem value="admin">admin</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button
          className="lg:w-28"
          disabled={addMember.isPending || !selectedUser}
          type="submit"
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>

      {fieldErrors.userId ? <p className="text-sm text-danger">{fieldErrors.userId}</p> : null}
    </form>
  )
}
