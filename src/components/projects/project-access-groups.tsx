'use client'

import { ShieldCheck, Trash2, UsersRound } from 'lucide-react'
import { useState } from 'react'

import { ErrorState } from '@/components/shared/error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useGrantProjectAccessGroup,
  useProjectAccessGroups,
  useRevokeProjectAccessGroup,
} from '@/lib/hooks/use-groups'
import { useToast } from '@/lib/hooks/use-toast'
import type { AccessGroupProjectRole } from '@/lib/types/models'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

const ROLE_LABELS: Record<AccessGroupProjectRole, string> = {
  admin: 'Admin',
  member: 'Member',
  readonly: 'Read only',
}

export function ProjectAccessGroups({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const groupsQuery = useProjectAccessGroups(projectId)
  const grantGroup = useGrantProjectAccessGroup(projectId)
  const revokeGroup = useRevokeProjectAccessGroup(projectId)
  const [groupId, setGroupId] = useState('')
  const [role, setRole] = useState<AccessGroupProjectRole>('member')
  const groups = groupsQuery.data?.groups ?? []
  const grants = groupsQuery.data?.grants ?? []
  const grantedIds = new Set(grants.map((grant) => grant.groupId))
  const availableGroups = groups.filter((group) => !grantedIds.has(group.id))

  async function saveGrant(targetGroupId: string, targetRole: AccessGroupProjectRole) {
    try {
      await grantGroup.mutateAsync({ groupId: targetGroupId, input: { role: targetRole } })
      setGroupId('')
      toast.success('Group project access updated.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update group access.'))
    }
  }

  async function revoke(targetGroupId: string) {
    try {
      await revokeGroup.mutateAsync(targetGroupId)
      toast.success('Group access revoked. Direct memberships were preserved.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to revoke group access.'))
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-border">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-medium">Group access</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Grant this project to an organisation group. Each member receives the strongest of their
          group and direct roles.
        </p>
      </div>

      <div className="p-4">
        {groupsQuery.isError ? (
          <ErrorState
            message={getApiFriendlyMessage(groupsQuery.error, 'Group access could not be loaded.')}
            onRetry={() => void groupsQuery.refetch()}
            title="Groups unavailable"
          />
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
              <Select onValueChange={setGroupId} value={groupId}>
                <SelectTrigger aria-label="Access group">
                  <SelectValue placeholder="Select an access group" />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                onValueChange={(value) => setRole(value as AccessGroupProjectRole)}
                value={role}
              >
                <SelectTrigger aria-label="Group project role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!groupId || grantGroup.isPending}
                onClick={() => void saveGrant(groupId, role)}
                type="button"
                variant="outline"
              >
                Grant access
              </Button>
            </div>

            <div className="mt-4 divide-y divide-border">
              {grants.map((grant) => (
                <div className="flex flex-wrap items-center gap-3 py-3" key={grant.id}>
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {grant.group?.name ?? grant.groupId}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {grant.group?.slug ?? grant.groupId}
                    </p>
                  </div>
                  <Badge>{ROLE_LABELS[grant.role]}</Badge>
                  <Select
                    onValueChange={(value) =>
                      void saveGrant(grant.groupId, value as AccessGroupProjectRole)
                    }
                    value={grant.role}
                  >
                    <SelectTrigger
                      aria-label={`Role for ${grant.group?.name ?? grant.groupId}`}
                      className="w-32"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    aria-label={`Revoke ${grant.group?.name ?? grant.groupId}`}
                    disabled={revokeGroup.isPending}
                    onClick={() => void revoke(grant.groupId)}
                    className="h-8 w-8 px-0"
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}
              {!groupsQuery.isLoading && grants.length === 0 ? (
                <p className="py-5 text-center text-xs text-muted-foreground">
                  No groups have access to this project.
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
