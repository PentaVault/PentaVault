'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'

import { TokenIssueForm } from '@/components/dashboard/token-issue-form'
import { TokenRevokeForm } from '@/components/dashboard/token-revoke-form'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { StatusBadge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProject } from '@/lib/hooks/use-projects'
import type { SecretMode } from '@/lib/types/models'
import { formatDateTime } from '@/lib/utils/format'

export default function ProjectTokensPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null
  const projectQuery = useProject(projectId)

  const [latestIssuedToken, setLatestIssuedToken] = useState<{
    tokenStart: string
    expiresAt: string
    mode: SecretMode
  } | null>(null)

  const projectName = projectQuery.data?.project.name ?? 'Project'

  if (!projectId) {
    return (
      <PageWrapper>
        <Card>
          <CardHeader>
            <CardTitle>Tokens</CardTitle>
            <CardDescription>Project context is required to manage tokens.</CardDescription>
          </CardHeader>
        </Card>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Issue token</CardTitle>
            <CardDescription>
              Create scoped proxy tokens for {projectName}. Keep gateway and compatibility modes
              explicit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TokenIssueForm onIssued={setLatestIssuedToken} />

            <div className="rounded-xl border border-border p-3">
              <p className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
                Latest issued token metadata
              </p>
              {latestIssuedToken ? (
                <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                  <p>token start: {latestIssuedToken.tokenStart}</p>
                  <div className="flex items-center gap-2">
                    <span>mode:</span>
                    <StatusBadge
                      tone={latestIssuedToken.mode === 'gateway' ? 'warning' : 'success'}
                    >
                      {latestIssuedToken.mode}
                    </StatusBadge>
                  </div>
                  <p>expires: {formatDateTime(latestIssuedToken.expiresAt)}</p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  Issue a token to view safe metadata.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revoke token</CardTitle>
            <CardDescription>
              Revoke compromised or unused tokens quickly. Revocation is immediate and auditable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TokenRevokeForm />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
