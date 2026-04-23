'use client'

import { UserPlus } from 'lucide-react'

import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/hooks/use-auth'
import { useOrganizationMembers } from '@/lib/hooks/use-team'

export default function OrganizationMembersPage() {
  const auth = useAuth()
  const activeOrg = auth.activeOrganization
  const membersQuery = useOrganizationMembers(activeOrg?.organization.id ?? null)
  const orgRole = activeOrg?.membership.role
  const canManage = orgRole === 'owner' || orgRole === 'admin'
  const members = membersQuery.data?.members ?? []

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
          <Button disabled size="sm" type="button" variant="outline">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite member
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organisation members</CardTitle>
          <CardDescription>
            Members listed here can be added to projects in this organisation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {membersQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading members...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members found.</p>
          ) : (
            <div className="rounded-lg border border-border">
              {members.map((member, index) => (
                <div
                  className="flex items-center justify-between gap-4 border-border px-4 py-3 data-[border=true]:border-b"
                  data-border={index !== members.length - 1}
                  key={member.membership.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member.user.name ?? member.user.email ?? member.user.id}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.user.email ?? member.user.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.membership.memberType === 'guest' ? (
                      <StatusBadge tone="warning">guest</StatusBadge>
                    ) : null}
                    <StatusBadge tone={member.membership.role === 'owner' ? 'warning' : 'neutral'}>
                      {member.membership.role}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
