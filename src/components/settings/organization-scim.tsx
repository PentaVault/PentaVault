'use client'

import { Copy, Loader2, Plus, Trash2, Users } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { env } from '@/lib/env'
import { useIssueScimToken, useRevokeScimToken, useScimTokens } from '@/lib/hooks/use-scim'
import { useToast } from '@/lib/hooks/use-toast'
import type { ScimToken } from '@/lib/types/api'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

function TokenRow({ token }: { token: ScimToken }) {
  const { toast } = useToast()
  const revokeToken = useRevokeScimToken()

  async function handleRevoke(): Promise<void> {
    try {
      await revokeToken.mutateAsync(token.id)
      toast.success('Token revoked. The directory can no longer change members.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to revoke this token right now.'))
    }
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{token.label}</span>
          {token.revokedAt ? (
            <Badge className="border border-border text-muted-foreground">Revoked</Badge>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {token.lastUsedAt
            ? `Last used ${new Date(token.lastUsedAt).toLocaleString()}`
            : 'Never used'}
        </p>
      </div>

      {token.revokedAt ? null : (
        <Button
          aria-label={`Revoke token ${token.label}`}
          disabled={revokeToken.isPending}
          onClick={() => void handleRevoke()}
          size="sm"
          type="button"
          variant="outline"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

export function OrganizationScim() {
  const { toast } = useToast()
  const { data, isPending, isError } = useScimTokens()
  const issueToken = useIssueScimToken()
  const [label, setLabel] = useState('')
  const [issued, setIssued] = useState<string | null>(null)

  async function handleIssue(): Promise<void> {
    if (!label.trim()) {
      toast.error('Give the token a name so you can tell directories apart.')
      return
    }

    try {
      const result = await issueToken.mutateAsync(label.trim())
      setLabel('')
      // Held in component state only, and only until the page changes: the
      // server keeps a hash and can never show it again.
      setIssued(result.token)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to issue a token right now.'))
    }
  }

  async function copyIssued(): Promise<void> {
    if (!issued) return
    try {
      await navigator.clipboard.writeText(issued)
      toast.success('Token copied.')
    } catch {
      toast.error('Copy failed — select the token and copy it manually.')
    }
  }

  const tokens = data?.tokens ?? []
  const scimBaseUrl = new URL('/scim/v2', env.apiUrl).toString()

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Directory sync (SCIM)
        </CardTitle>
        <CardDescription>
          Let your identity provider add and remove members automatically. Point it at{' '}
          <span className="font-mono text-[11px]">{scimBaseUrl}</span> and give it a token below.
          Removing someone in your directory revokes their PentaVault access immediately.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-3 border-b border-border pb-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1 space-y-1">
              <label
                className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                htmlFor="scim-token-label"
              >
                Name
              </label>
              <Input
                id="scim-token-label"
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Okta production"
                value={label}
              />
            </div>

            <Button
              disabled={issueToken.isPending}
              onClick={() => void handleIssue()}
              size="sm"
              type="button"
            >
              {issueToken.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Issue token
            </Button>
          </div>

          {issued ? (
            <div className="space-y-2 rounded-md border border-warning/40 bg-warning-muted p-3">
              <p className="text-xs text-warning">
                Copy this now — PentaVault stores only a hash and cannot show it again.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 break-all font-mono text-[11px]">{issued}</code>
                <Button onClick={() => void copyIssued()} size="sm" type="button" variant="outline">
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
                <Button onClick={() => setIssued(null)} size="sm" type="button" variant="outline">
                  Done
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {isPending ? (
          <p className="py-6 text-sm text-muted-foreground">Loading tokens...</p>
        ) : isError ? (
          <p className="py-6 text-sm text-danger">Unable to load SCIM tokens.</p>
        ) : tokens.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No directory sync configured. Members are added and removed by hand.
          </p>
        ) : (
          <div>
            {tokens.map((token) => (
              <TokenRow key={token.id} token={token} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
