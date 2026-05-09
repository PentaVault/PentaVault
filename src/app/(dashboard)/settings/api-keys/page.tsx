'use client'

import { KeyRound, RefreshCw, Terminal, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { ApiKeyCreateForm } from '@/components/dashboard/api-key-create-form'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/lib/api/auth'
import { useToast } from '@/lib/hooks/use-toast'
import type { AuthApiKeyListItem } from '@/lib/types/api'
import { getApiFriendlyMessage } from '@/lib/utils/errors'
import { formatDateTime } from '@/lib/utils/format'

const permissionLabels: Record<string, string> = {
  proxy: 'proxy',
}

function summarizePermissions(apiKey: AuthApiKeyListItem): string {
  const parts = Object.entries(apiKey.permissions)
    .filter(([, actions]) => Array.isArray(actions) && actions.length > 0)
    .map(([resource, actions]) => `${permissionLabels[resource] ?? resource}: ${actions.join('/')}`)

  return parts.length > 0 ? parts.join(', ') : 'No permissions'
}

function apiKeySourceLabel(source: AuthApiKeyListItem['source']): string {
  if (source === 'cli') {
    return 'CLI'
  }

  if (source === 'application') {
    return 'Application'
  }

  return 'User'
}

export default function ApiKeysPage() {
  const { toast } = useToast()
  const [apiKeys, setApiKeys] = useState<AuthApiKeyListItem[] | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const listedApiKeys = apiKeys ?? []

  const refreshApiKeys = useCallback(async (signal?: { cancelled: boolean }): Promise<void> => {
    if (signal?.cancelled) {
      return
    }

    try {
      setIsPending(true)
      setError(null)
      const response = await authApi.listApiKeys()

      if (!signal?.cancelled) {
        setApiKeys(response.apiKeys)
      }
    } catch (refreshError) {
      if (!signal?.cancelled) {
        setError(getApiFriendlyMessage(refreshError, 'Unable to load API keys right now.'))
      }
    } finally {
      if (!signal?.cancelled) {
        setIsPending(false)
      }
    }
  }, [])

  async function revokeApiKey(apiKeyId: string): Promise<void> {
    try {
      setRevokingId(apiKeyId)
      await authApi.revokeApiKey(apiKeyId)
      toast.success('API key revoked.')
      await refreshApiKeys()
    } catch (revokeError) {
      toast.error(getApiFriendlyMessage(revokeError, 'Unable to revoke this API key.'))
    } finally {
      setRevokingId(null)
    }
  }

  useEffect(() => {
    const signal = { cancelled: false }
    void refreshApiKeys(signal)

    return () => {
      signal.cancelled = true
    }
  }, [refreshApiKeys])

  return (
    <PageWrapper>
      <Card>
        <CardHeader>
          <CardTitle>Account API keys</CardTitle>
          <CardDescription>
            Create account-scoped keys for automation and CLI access. Backend authorization still
            enforces your organization and project permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyCreateForm onCreated={() => void refreshApiKeys()} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Generated keys</CardTitle>
            <CardDescription>
              All keys appear here with a source tag for CLI, user-created, or application-created
              credentials.
            </CardDescription>
          </div>
          <Button
            disabled={isPending}
            onClick={() => void refreshApiKeys()}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4" />
            {isPending ? 'Refreshing...' : 'Refresh'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <ErrorState
              title="Unable to load API keys"
              message={error}
              onRetry={() => void refreshApiKeys()}
            />
          ) : null}

          {!error && !apiKeys ? (
            <p className="text-sm text-muted-foreground">Loading API keys...</p>
          ) : !error && listedApiKeys.length === 0 ? (
            <EmptyState
              title="No API keys yet"
              description="Create an account API key or sign in from the CLI to see generated keys here."
            />
          ) : !error ? (
            <div className="space-y-3">
              {listedApiKeys.map((apiKey) => (
                <div
                  className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={apiKey.id}
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {apiKey.source === 'cli' ? (
                        <Terminal className="h-4 w-4 text-accent" />
                      ) : (
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                      )}
                      <p className="truncate text-sm font-medium">
                        {apiKey.name ?? (apiKey.source === 'cli' ? 'PentaVault CLI' : 'API key')}
                      </p>
                      <StatusBadge tone={apiKey.source === 'cli' ? 'success' : 'neutral'}>
                        {apiKeySourceLabel(apiKey.source)}
                      </StatusBadge>
                      <StatusBadge tone={apiKey.enabled ? 'success' : 'danger'}>
                        {apiKey.enabled ? 'enabled' : 'revoked'}
                      </StatusBadge>
                    </div>

                    <p className="break-all text-xs text-muted-foreground">
                      Prefix: {apiKey.prefix ?? apiKey.start ?? 'Unavailable'} {'\u2022'} Key ID:{' '}
                      {apiKey.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created: {formatDateTime(apiKey.createdAt)} {'\u2022'} Last used:{' '}
                      {formatDateTime(apiKey.lastRequest)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Permissions: {summarizePermissions(apiKey)}
                    </p>
                  </div>

                  <Button
                    disabled={!apiKey.enabled || revokingId === apiKey.id}
                    onClick={() => void revokeApiKey(apiKey.id)}
                    size="sm"
                    type="button"
                    variant="danger"
                  >
                    <Trash2 className="h-4 w-4" />
                    {revokingId === apiKey.id ? 'Revoking...' : 'Revoke'}
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
