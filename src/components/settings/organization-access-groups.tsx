'use client'

import { Plus, ShieldCheck, Trash2, UserMinus, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ErrorState } from '@/components/shared/error-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useAccessGroupMembers,
  useAddAccessGroupMember,
  useCreateAccessGroup,
  useDeleteAccessGroup,
  useOrganizationAccessGroups,
  useRemoveAccessGroupMember,
} from '@/lib/hooks/use-groups'
import { useOrganizationMembers } from '@/lib/hooks/use-team'
import { useToast } from '@/lib/hooks/use-toast'
import type { AccessGroup } from '@/lib/types/models'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function OrganizationAccessGroups({ organizationId }: { organizationId: string }) {
  const { toast } = useToast()
  const groupsQuery = useOrganizationAccessGroups(organizationId)
  const organizationMembersQuery = useOrganizationMembers(organizationId)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AccessGroup | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [newMemberId, setNewMemberId] = useState('')
  const groups = groupsQuery.data?.groups ?? []
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null
  const membersQuery = useAccessGroupMembers(organizationId, selectedGroup?.id ?? null)
  const createGroup = useCreateAccessGroup(organizationId)
  const deleteGroup = useDeleteAccessGroup(organizationId)
  const addMember = useAddAccessGroupMember(organizationId, selectedGroup?.id ?? null)
  const removeMember = useRemoveAccessGroupMember(organizationId, selectedGroup?.id ?? null)
  const assignedUserIds = new Set((membersQuery.data?.members ?? []).map((member) => member.userId))
  const availableMembers = useMemo(
    () =>
      (organizationMembersQuery.data?.members ?? []).filter(
        (member) => !assignedUserIds.has(member.user.id)
      ),
    [organizationMembersQuery.data?.members, assignedUserIds]
  )

  async function handleCreate() {
    try {
      const response = await createGroup.mutateAsync({
        name,
        slug: slugify(name),
        description: description.trim() || null,
      })
      setSelectedGroupId(response.group.id)
      setName('')
      setDescription('')
      setCreateOpen(false)
      toast.success('Access group created.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to create this access group.'))
    }
  }

  async function handleAddMember() {
    if (!newMemberId) return
    try {
      await addMember.mutateAsync(newMemberId)
      setNewMemberId('')
      toast.success('Member added to group.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to add this member.'))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteGroup.mutateAsync(deleteTarget.id)
      if (selectedGroupId === deleteTarget.id) setSelectedGroupId(null)
      setDeleteTarget(null)
      toast.success('Access group deleted. Direct project memberships were preserved.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to delete this access group.'))
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Access groups</CardTitle>
            <CardDescription>
              Assign teams to projects once and combine group access with direct membership.
            </CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)} size="sm" type="button">
            <Plus className="mr-1.5 h-4 w-4" /> New group
          </Button>
        </CardHeader>
        <CardContent>
          {groupsQuery.isError ? (
            <ErrorState
              message={getApiFriendlyMessage(
                groupsQuery.error,
                'Access groups could not be loaded.'
              )}
              onRetry={() => void groupsQuery.refetch()}
              title="Groups unavailable"
            />
          ) : groups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-5 py-8 text-center">
              <UsersRound className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No access groups yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a group for a team, function, or operational responsibility.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.4fr)]">
              <div className="space-y-2">
                {groups.map((group) => (
                  <button
                    className={cn(
                      'flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
                      selectedGroup?.id === group.id
                        ? 'border-accent/55 bg-accent/8'
                        : 'border-border hover:bg-background-secondary/40'
                    )}
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{group.name}</span>
                      <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                        {group.slug}
                      </span>
                    </span>
                    <Badge>{group.memberCount}</Badge>
                  </button>
                ))}
              </div>

              {selectedGroup ? (
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-accent" />
                        <p className="text-sm font-medium">{selectedGroup.name}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedGroup.description ?? 'No description'} ·{' '}
                        {selectedGroup.projectCount} project
                        {selectedGroup.projectCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <Button
                      aria-label={`Delete ${selectedGroup.name}`}
                      onClick={() => setDeleteTarget(selectedGroup)}
                      className="h-8 w-8 px-0"
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Select onValueChange={setNewMemberId} value={newMemberId}>
                      <SelectTrigger aria-label="Organization member" className="min-w-0 flex-1">
                        <SelectValue placeholder="Select an organisation member" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMembers.map((member) => (
                          <SelectItem key={member.user.id} value={member.user.id}>
                            {member.user.name ?? member.user.email ?? member.user.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      disabled={!newMemberId || addMember.isPending}
                      onClick={() => void handleAddMember()}
                      type="button"
                      variant="outline"
                    >
                      Add
                    </Button>
                  </div>

                  <div className="mt-4 divide-y divide-border">
                    {(membersQuery.data?.members ?? []).map((member) => (
                      <div className="flex items-center justify-between gap-3 py-3" key={member.id}>
                        <div className="min-w-0">
                          <p className="truncate text-sm">{member.user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.user.email}
                          </p>
                        </div>
                        <Button
                          aria-label={`Remove ${member.user.name}`}
                          disabled={removeMember.isPending}
                          onClick={() => void removeMember.mutateAsync(member.userId)}
                          className="h-8 w-8 px-0"
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {!membersQuery.isLoading && (membersQuery.data?.members.length ?? 0) === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        This group has no members.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/45" />
          <DialogContent className="fixed top-1/2 left-1/2 z-50 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-xl">
            <DialogTitle>Create access group</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Group access is additive and never removes a stronger direct project role.
            </DialogDescription>
            <div className="mt-5 space-y-3">
              <Input
                onChange={(event) => setName(event.target.value)}
                placeholder="Platform team"
                value={name}
              />
              <Input
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional description"
                value={description}
              />
              <p className="font-mono text-xs text-muted-foreground">
                Slug: {slugify(name) || '—'}
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setCreateOpen(false)} type="button" variant="outline">
                Cancel
              </Button>
              <Button
                disabled={!slugify(name) || createGroup.isPending}
                onClick={() => void handleCreate()}
                type="button"
              >
                Create group
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Project grants from this group will be removed. Existing direct memberships remain
            unchanged.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Delete group</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
