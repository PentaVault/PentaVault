'use client'

import { KeyRound, RefreshCw, ShieldCheck, Terminal, Trash2 } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { ApiKeyCreateForm } from '@/components/dashboard/api-key-create-form'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SegmentedTabs } from '@/components/ui/segmented-tabs'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { authApi } from '@/lib/api/auth'
import { useToast } from '@/lib/hooks/use-toast'
import { useUiStore } from '@/lib/stores/ui-store'
import type { AuthApiKeyListItem, AuthApiKeyTokenType } from '@/lib/types/api'
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

const tokenTabs: Array<{
  value: AuthApiKeyTokenType
  label: string
  title: string
  description: string
  canCreate: boolean
}> = [
  {
    value: 'command-line',
    label: 'Command Line',
    title: 'Command line tokens',
    description: 'Tokens created by interactive CLI login for local development workflows.',
    canCreate: false,
  },
  {
    value: 'service-account',
    label: 'Service Account',
    title: 'Service account tokens',
    description: 'Automation tokens for shared services and production integrations.',
    canCreate: true,
  },
  {
    value: 'personal',
    label: 'Personal',
    title: 'Personal tokens',
    description: 'Account-owned tokens for individual development and ad hoc API automation.',
    canCreate: true,
  },
  {
    value: 'scim',
    label: 'SCIM',
    title: 'SCIM tokens',
    description: 'Tokens reserved for identity-provider provisioning and team management.',
    canCreate: true,
  },
  {
    value: 'audit',
    label: 'Audit',
    title: 'Audit tokens',
    description: 'Read-focused tokens for compliance tooling and activity monitoring.',
    canCreate: true,
  },
]

function isTokenTab(value: string | null): value is AuthApiKeyTokenType {
  return tokenTabs.some((tab) => tab.value === value)
}

export default function ApiKeysPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [apiKeys, setApiKeys] = useState<AuthApiKeyListItem[] | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const activeTab = useUiStore((state) => state.accountTokensActiveTab)
  const setActiveTab = useUiStore((state) => state.setAccountTokensActiveTab)
  const listedApiKeys = apiKeys ?? []
  const activeTabConfig = tokenTabs.find((tab) => tab.value === activeTab) ?? tokenTabs[0]
  const visibleApiKeys = listedApiKeys.filter((apiKey) => apiKey.tokenType === activeTab)
  const tabFromUrl = searchParams.get('tab')

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
        setError(getApiFriendlyMessage(refreshError, 'Unable to load tokens right now.'))
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
      toast.success('Token revoked.')
      await refreshApiKeys()
    } catch (revokeError) {
      toast.error(getApiFriendlyMessage(revokeError, 'Unable to revoke this token.'))
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

  useEffect(() => {
    if (isTokenTab(tabFromUrl)) {
      setActiveTab(tabFromUrl)
      return
    }

    setActiveTab('command-line')
  }, [setActiveTab, tabFromUrl])

  function handleTabChange(value: string): void {
    if (!isTokenTab(value)) {
      return
    }

    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set('tab', value)
    setActiveTab(value)
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }

  return (
    <PageWrapper>
      <Card>
        <CardHeader>
          <CardTitle>Tokens</CardTitle>
          <CardDescription>
            Manage account-owned authentication tokens for CLI, automation, identity, and audit
            workflows. Organisation scopes limit where a token can be used.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>

      <Tabs className="mt-6 space-y-6" onValueChange={handleTabChange} value={activeTab}>
        <SegmentedTabs
          aria-label="Token type"
          onValueChange={handleTabChange}
          tabs={tokenTabs.map((tab) => ({ value: tab.value, label: tab.label }))}
          value={activeTab}
        />

        {tokenTabs.map((tab) => (
          <TabsContent className="space-y-6" key={tab.value} value={tab.value}>
            <Card>
              <CardHeader>
                <CardTitle>{tab.title}</CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              {tab.canCreate ? (
                <CardContent>
                  <ApiKeyCreateForm onCreated={() => void refreshApiKeys()} tokenType={tab.value} />
                </CardContent>
              ) : (
                <CardContent>
                  <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                    Command line tokens are created by signing in from the PentaVault CLI. They are
                    shown here for review and revocation.
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card className="mt-6">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{activeTabConfig.label} tokens</CardTitle>
            <CardDescription>
              Generated credentials are shown with their source, status, permissions, and
              organisation scope.
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
              title="Unable to load tokens"
              message={error}
              onRetry={() => void refreshApiKeys()}
            />
          ) : null}

          {!error && !apiKeys ? (
            <p className="text-sm text-muted-foreground">Loading tokens...</p>
          ) : !error && visibleApiKeys.length === 0 ? (
            <EmptyState
              title={`No ${activeTabConfig.label.toLowerCase()} tokens yet`}
              description="Create a token or sign in from the CLI to see generated credentials here."
            />
          ) : !error ? (
            <div className="space-y-3">
              {visibleApiKeys.map((apiKey) => (
                <div
                  className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={apiKey.id}
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {apiKey.source === 'cli' ? (
                        <Terminal className="h-4 w-4 text-accent" />
                      ) : apiKey.tokenType === 'audit' || apiKey.tokenType === 'scim' ? (
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                      )}
                      <p className="truncate text-sm font-medium">
                        {apiKey.name ?? (apiKey.source === 'cli' ? 'PentaVault CLI' : 'Token')}
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
                    <p className="text-xs text-muted-foreground">
                      Organisation:{' '}
                      {apiKey.organizationName ??
                        (apiKey.organizationId ? apiKey.organizationId : 'Unscoped legacy token')}
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
