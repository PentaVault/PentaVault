'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'

import { formatDistanceToNow } from 'date-fns'
import { Search, Trash2, UserMinus, UserPlus } from 'lucide-react'

import { StatusBadge } from '@/components/ui/badge'
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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/lib/hooks/use-auth'
import { useRevokeInvitation, useSendOrgInvitation } from '@/lib/hooks/use-invitations'
import {
  useOrganizationMembers,
  useRemoveOrganizationMember,
  useUpdateOrganizationMember,
} from '@/lib/hooks/use-team'
import { useToast } from '@/lib/hooks/use-toast'
import type { AuthOrganizationMember, OrgInvitation, OrgRole } from '@/lib/types/auth'
import { getApiErrorPayload, getApiFriendlyMessage } from '@/lib/utils/errors'

const ORG_ROLES: OrgRole[] = ['owner', 'admin', 'developer', 'readonly', 'auditor']

const ROLE_LEVEL: Record<OrgRole, number> = {
  owner: 5,
  admin: 4,
  developer: 3,
  readonly: 2,
  auditor: 1,
}

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  developer: 'Member',
  readonly: 'Read-only',
  auditor: 'Auditor',
}

const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  owner: 'Full organisation control',
  admin: 'Manage members and projects',
  developer: 'Work in assigned projects',
  readonly: 'View assigned resources',
  auditor: 'Audit and review access',
}

function isOrgRole(value: string | null | undefined): value is OrgRole {
  return Boolean(value && value in ROLE_LEVEL)
}

function canInviteRole(actorRole: string | null | undefined, role: OrgRole): boolean {
  if (!isOrgRole(actorRole)) {
    return false
  }

  return ROLE_LEVEL[role] <= ROLE_LEVEL[actorRole]
}

function canChangeMemberRole(
  actorRole: string | null | undefined,
  actorUserId: string | null,
  target: AuthOrganizationMember
): boolean {
  return actorRole === 'owner' && actorUserId !== target.user.id
}

function canRemoveMember(
  actorRole: string | null | undefined,
  actorUserId: string | null,
  target: AuthOrganizationMember
): boolean {
  if (!isOrgRole(actorRole) || actorUserId === target.user.id) {
    return false
  }

  if (actorRole === 'owner') {
    return true
  }

  if (actorRole === 'admin' && isOrgRole(target.membership.role)) {
    return ROLE_LEVEL[target.membership.role] < ROLE_LEVEL.admin
  }

  return false
}

function roleLabel(role: string | null | undefined): string {
  return isOrgRole(role) ? ROLE_LABELS[role] : (role ?? 'member')
}

function invitationTone(status: OrgInvitation['status']) {
  if (status === 'pending') return 'warning'
  if (status === 'accepted') return 'success'
  if (status === 'rejected' || status === 'revoked') return 'neutral'
  return 'danger'
}

function invitationStatusLabel(status: OrgInvitation['status']) {
  if (status === 'accepted') return 'joined'
  if (status === 'rejected') return 'declined'
  return status
}

function InviteMemberDialog({
  open,
  onOpenChange,
  organizationId,
  actorRole,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string | null
  actorRole: string | null | undefined
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrgRole>('developer')
  const sendInvitation = useSendOrgInvitation(organizationId)
  const { toast } = useToast()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    try {
      await sendInvitation.mutateAsync({ email: normalizedEmail, role })
      toast.success(`Invitation sent to ${normalizedEmail}.`)
      setEmail('')
      setRole('developer')
      onOpenChange(false)
    } catch (error) {
      const payload = getApiErrorPayload(error)
      if (payload?.code === 'ORG_MEMBER_ALREADY_EXISTS') {
        toast.error(`${normalizedEmail} is already a member of this organisation.`)
        return
      }
      if (payload?.code === 'INVITATION_ALREADY_PENDING') {
        toast.error(`A pending invitation already exists for ${normalizedEmail}.`)
        return
      }
      if (payload?.code === 'ROLE_ESCALATION') {
        toast.error('You cannot invite someone with a higher role than your own.')
        return
      }

      toast.error(getApiFriendlyMessage(error, 'Failed to send invitation.'))
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/45" />
        <DialogContent className="fixed top-1/2 left-1/2 z-50 w-[95vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5 shadow-xl">
          <DialogTitle className="text-lg font-semibold">Invite member</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Send a secure invitation that expires in 7 days.
          </DialogDescription>

          <form className="mt-4 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-1">
              <label
                className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                htmlFor="invite-email"
              >
                Email address
              </label>
              <Input
                autoFocus
                id="invite-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="colleague@example.com"
                required
                type="email"
                value={email}
              />
            </div>

            <div className="space-y-1">
              <label
                className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                htmlFor="invite-role"
              >
                Role
              </label>
              <Select onValueChange={(value) => setRole(value as OrgRole)} value={role}>
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {ORG_ROLES.map((value) => (
                      <SelectItem
                        disabled={!canInviteRole(actorRole, value)}
                        key={value}
                        value={value}
                      >
                        {ROLE_LABELS[value]} - {ROLE_DESCRIPTIONS[value]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={!email.trim() || sendInvitation.isPending} type="submit">
                {sendInvitation.isPending ? 'Sending...' : 'Send invitation'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

export default function OrganizationMembersPage() {
  const auth = useAuth()
  const activeOrg = auth.activeOrganization
  const organizationId = activeOrg?.organization.id ?? null
  const membersQuery = useOrganizationMembers(organizationId)
  const updateMember = useUpdateOrganizationMember(organizationId)
  const removeMember = useRemoveOrganizationMember(organizationId)
  const revokeInvitation = useRevokeInvitation(organizationId)
  const { toast } = useToast()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<AuthOrganizationMember | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const orgRole = activeOrg?.membership.role
  const currentUserId = auth.session?.user.id ?? null
  const canManage = orgRole === 'owner' || orgRole === 'admin'
  const members = membersQuery.data?.members ?? []
  const currentMember = members.find((member) => member.user.id === currentUserId) ?? null
  const normalizedMemberSearch = memberSearch.trim().toLowerCase().replace(/^@/, '')
  const matchesMemberSearch = (member: AuthOrganizationMember): boolean => {
    if (!normalizedMemberSearch) {
      return true
    }

    return [
      member.user.name,
      member.user.username,
      member.user.email,
      member.membership.role,
      member.membership.memberType,
    ].some((value) => value?.toLowerCase().includes(normalizedMemberSearch))
  }
  const matchesInvitationSearch = (invitation: OrgInvitation): boolean => {
    if (!normalizedMemberSearch) {
      return true
    }

    return [invitation.email, invitation.role, invitation.status].some((value) =>
      value.toLowerCase().includes(normalizedMemberSearch)
    )
  }
  const visibleMembers = members.filter(matchesMemberSearch)
  const invitations = useMemo(() => {
    const latestByEmail = new Map<string, OrgInvitation>()
    for (const invitation of membersQuery.data?.invitations ?? []) {
      const key = invitation.email.trim().toLowerCase()
      const current = latestByEmail.get(key)
      const currentTime = current ? new Date(current.updatedAt).getTime() : 0
      const invitationTime = new Date(invitation.updatedAt).getTime()
      if (!current || invitationTime >= currentTime) {
        latestByEmail.set(key, invitation)
      }
    }

    return Array.from(latestByEmail.values())
      .filter((invitation) => invitation.status === 'pending' || invitation.status === 'rejected')
      .sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      )
  }, [membersQuery.data?.invitations])
  const visibleInvitations = canManage ? invitations.filter(matchesInvitationSearch) : []
  const visibleMemberAndInviteCount = visibleMembers.length + visibleInvitations.length

  async function changeRole(member: AuthOrganizationMember, role: OrgRole) {
    try {
      await updateMember.mutateAsync({ userId: member.user.id, role })
      toast.success(
        `${member.user.name ?? member.user.email ?? 'Member'} is now ${roleLabel(role)}.`
      )
    } catch (error) {
      const payload = getApiErrorPayload(error)
      if (payload?.code === 'ROLE_ESCALATION') {
        toast.error('You cannot grant a role higher than your own.')
        return
      }
      if (payload?.code === 'ORG_FORBIDDEN' && payload.error) {
        toast.error(payload.error)
        return
      }

      toast.error(getApiFriendlyMessage(error, 'Unable to update this member role.'))
    }
  }

  async function removeSelectedMember() {
    if (!memberToRemove) {
      return
    }

    try {
      await removeMember.mutateAsync(memberToRemove.user.id)
      toast.success(`${memberToRemove.user.name ?? memberToRemove.user.email ?? 'Member'} removed.`)
      setMemberToRemove(null)
    } catch (error) {
      const payload = getApiErrorPayload(error)
      if (payload?.code === 'ORG_FORBIDDEN' && payload.error) {
        toast.error(payload.error)
        return
      }

      toast.error(getApiFriendlyMessage(error, 'Unable to remove this member.'))
    }
  }

  async function removeInvitationMessage(invitation: OrgInvitation) {
    try {
      await revokeInvitation.mutateAsync(invitation.id)
      toast.success(`Invitation message for ${invitation.email} removed.`)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to remove this invitation message.'))
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Members</h2>
          <p className="text-sm text-muted-foreground">
            Manage who has access to this organisation.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setInviteOpen(true)} size="sm" type="button" variant="outline">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite member
          </Button>
        ) : null}
      </div>

      <InviteMemberDialog
        actorRole={orgRole}
        onOpenChange={setInviteOpen}
        open={inviteOpen}
        organizationId={organizationId}
      />

      <Card>
        <CardHeader>
          <CardTitle>Organisation members</CardTitle>
          <CardDescription>
            Members listed here can be added to projects in this organisation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {membersQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading members...</p>
          ) : (
            <>
              {currentMember ? (
                <div className="rounded-lg border border-border bg-background-secondary/30 p-4">
                  <p className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
                    You
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {currentMember.user.name ??
                          currentMember.user.email ??
                          currentMember.user.id}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {currentMember.user.username
                          ? `@${currentMember.user.username}`
                          : currentMember.user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentMember.membership.memberType === 'guest' ? (
                        <StatusBadge tone="warning">guest</StatusBadge>
                      ) : null}
                      <StatusBadge
                        tone={currentMember.membership.role === 'owner' ? 'warning' : 'neutral'}
                      >
                        {roleLabel(currentMember.membership.role)}
                      </StatusBadge>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">All organisation members</p>
                  <p className="text-xs text-muted-foreground">
                    Search by name, username, email, role, or invitation status.
                  </p>
                </div>
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Search organisation members"
                    className="h-10 pl-9"
                    onChange={(event) => setMemberSearch(event.target.value)}
                    placeholder="Search members"
                    value={memberSearch}
                  />
                </div>
              </div>

              {visibleMemberAndInviteCount === 0 ? (
                <p className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
                  {memberSearch.trim() ? 'No members match your search.' : 'No members found.'}
                </p>
              ) : (
                <div className="rounded-lg border border-border">
                  {visibleMembers.map((member, index) => (
                    <div
                      className="grid gap-3 border-border px-4 py-3 data-[border=true]:border-b lg:grid-cols-[minmax(0,1fr)_auto_auto]"
                      data-border={index !== visibleMemberAndInviteCount - 1}
                      key={member.membership.id}
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {member.user.name ?? member.user.email ?? member.user.id}
                          </p>
                          {member.user.id === currentUserId ? (
                            <StatusBadge tone="success">you</StatusBadge>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.user.username ? `@${member.user.username}` : member.user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 lg:justify-end">
                        {member.membership.memberType === 'guest' ? (
                          <StatusBadge tone="warning">guest</StatusBadge>
                        ) : null}
                        <StatusBadge
                          tone={member.membership.role === 'owner' ? 'warning' : 'neutral'}
                        >
                          {roleLabel(member.membership.role)}
                        </StatusBadge>
                      </div>
                      {canManage ? (
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          <Select
                            disabled={
                              !canChangeMemberRole(orgRole, currentUserId, member) ||
                              updateMember.isPending
                            }
                            onValueChange={(value) => void changeRole(member, value as OrgRole)}
                            {...(isOrgRole(member.membership.role)
                              ? { value: member.membership.role }
                              : {})}
                          >
                            <SelectTrigger
                              aria-label={`Change role for ${member.user.name ?? member.user.email ?? member.user.id}`}
                              className="w-36"
                            >
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {ORG_ROLES.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {ROLE_LABELS[value]}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <Button
                            aria-label={`Remove ${member.user.name ?? member.user.email ?? member.user.id}`}
                            className="h-9 w-9 px-0"
                            disabled={
                              !canRemoveMember(orgRole, currentUserId, member) ||
                              removeMember.isPending
                            }
                            onClick={() => setMemberToRemove(member)}
                            type="button"
                            variant="outline"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {visibleInvitations.map((invitation, index) => (
                    <div
                      className="grid gap-3 border-border px-4 py-3 data-[border=true]:border-t lg:grid-cols-[minmax(0,1fr)_auto_auto]"
                      data-border={visibleMembers.length > 0 || index > 0}
                      key={invitation.id}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{invitation.email}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          Invited as {roleLabel(invitation.role)} - updated{' '}
                          {formatDistanceToNow(new Date(invitation.updatedAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 lg:justify-end">
                        <StatusBadge tone={invitationTone(invitation.status)}>
                          {invitationStatusLabel(invitation.status)}
                        </StatusBadge>
                      </div>
                      <div className="flex items-center gap-2 lg:justify-end">
                        <Button
                          aria-label={`Remove invitation message for ${invitation.email}`}
                          className="h-9 w-9 px-0"
                          disabled={revokeInvitation.isPending}
                          onClick={() => void removeInvitationMessage(invitation)}
                          type="button"
                          variant="outline"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        open={Boolean(memberToRemove)}
      >
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/45" />
          <DialogContent className="fixed top-1/2 left-1/2 z-50 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5 shadow-xl">
            <DialogTitle className="text-lg font-semibold">Remove organisation member?</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              This removes the member from the organisation, all projects in it, and any project
              access tokens tied to those projects.
            </DialogDescription>
            {memberToRemove ? (
              <div className="mt-4 rounded-lg border border-border bg-background-secondary/40 p-3">
                <p className="truncate text-sm font-medium">
                  {memberToRemove.user.name ?? memberToRemove.user.email ?? memberToRemove.user.id}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {memberToRemove.user.username
                    ? `@${memberToRemove.user.username}`
                    : memberToRemove.user.email}
                </p>
              </div>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                onClick={() => setMemberToRemove(null)}
                size="sm"
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={removeMember.isPending}
                onClick={() => void removeSelectedMember()}
                size="sm"
                type="button"
                variant="danger"
              >
                {removeMember.isPending ? 'Removing...' : 'Remove member'}
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  )
}
