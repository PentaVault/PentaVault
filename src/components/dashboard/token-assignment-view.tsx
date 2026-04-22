'use client'

import { useMemo } from 'react'

import { Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useProjectSecrets } from '@/lib/hooks/use-secrets'
import { useProjectMembers } from '@/lib/hooks/use-team'
import { useGenerateToken, useProjectTokens, useRevokeToken } from '@/lib/hooks/use-tokens'
import type { ProjectMembership, ProxyToken, Secret } from '@/lib/types/models'
import { formatRelativeDate } from '@/lib/utils/format'

type TokenMap = Map<string, Map<string, ProxyToken>>

export function TokenAssignmentView({ projectId }: { projectId: string }) {
  const membersQuery = useProjectMembers(projectId)
  const secretsQuery = useProjectSecrets(projectId)
  const tokensQuery = useProjectTokens(projectId)

  const tokenMap = useMemo<TokenMap>(() => {
    const map: TokenMap = new Map()

    for (const token of tokensQuery.data ?? []) {
      if (!token.userId) {
        continue
      }

      if (!map.has(token.userId)) {
        map.set(token.userId, new Map())
      }

      map.get(token.userId)?.set(token.secretId, token)
    }

    return map
  }, [tokensQuery.data])

  if (membersQuery.isLoading || secretsQuery.isLoading || tokensQuery.isLoading) {
    return <TokenAssignmentSkeleton />
  }

  const members = membersQuery.data?.members ?? []
  const secrets = secretsQuery.data ?? []

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No project members yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {members.map((member) => (
        <MemberTokenRow
          key={member.userId}
          member={member}
          projectId={projectId}
          secrets={secrets}
          userTokens={tokenMap.get(member.userId) ?? new Map()}
        />
      ))}
    </div>
  )
}

function MemberTokenRow({
  member,
  secrets,
  userTokens,
  projectId,
}: {
  member: ProjectMembership
  secrets: Secret[]
  userTokens: Map<string, ProxyToken>
  projectId: string
}) {
  const displayName = member.user?.name ?? member.userId
  const email = member.user?.email ?? member.userId
  const initial = displayName.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-3 border-b border-border bg-card-elevated px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-background-elevated text-xs font-medium">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <span className="ml-auto font-mono text-xs text-muted-foreground">{member.role}</span>
      </div>

      <div className="divide-y divide-border">
        {secrets.length === 0 ? (
          <div className="px-4 py-3 text-xs text-muted-foreground">
            No secrets in this project yet.
          </div>
        ) : (
          secrets.map((secret) => (
            <SecretTokenRow
              key={secret.id}
              memberId={member.userId}
              projectId={projectId}
              secret={secret}
              token={userTokens.get(secret.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function SecretTokenRow({
  secret,
  token,
  memberId,
  projectId,
}: {
  secret: Secret
  token: ProxyToken | undefined
  memberId: string
  projectId: string
}) {
  const generateToken = useGenerateToken()
  const revokeToken = useRevokeToken()

  return (
    <div className="flex items-center gap-4 px-4 py-2.5">
      <button
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-danger disabled:opacity-30"
        disabled={!token || revokeToken.isPending}
        onClick={() => {
          if (token) {
            revokeToken.mutate({ projectId, tokenHash: token.tokenHash })
          }
        }}
        title={token ? 'Revoke token' : 'No token to revoke'}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>

      <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
        {secret.name}
      </span>

      {token ? (
        <span className="font-mono text-xs text-muted-foreground">****** {token.tokenStart}</span>
      ) : (
        <span className="text-xs text-muted-foreground">unassigned</span>
      )}

      {token ? (
        <span className="w-32 text-right text-xs text-muted-foreground">
          {formatRelativeDate(token.createdAt)}
        </span>
      ) : (
        <Button
          className="h-6 px-2 text-xs"
          disabled={generateToken.isPending}
          onClick={() =>
            generateToken.mutate({
              projectId,
              secretId: secret.id,
              userId: memberId,
              mode: secret.mode,
            })
          }
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus className="mr-1 h-3 w-3" />
          Generate
        </Button>
      )}
    </div>
  )
}

function TokenAssignmentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 animate-pulse rounded-lg border border-border bg-card" />
      <div className="h-32 animate-pulse rounded-lg border border-border bg-card" />
    </div>
  )
}
