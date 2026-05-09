'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

import { CopyButton } from '@/components/shared/copy-button'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/api/auth'
import { useToast } from '@/lib/hooks/use-toast'
import type {
  AuthApiKeyPermissionAction,
  AuthApiKeyPermissionResource,
  AuthApiKeyPermissions,
  AuthCreateApiKeyResponse,
} from '@/lib/types/api'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type ApiKeyCreateFormProps = {
  onCreated?: (apiKey: AuthCreateApiKeyResponse) => void
}

const permissionRows: Array<{
  resource: AuthApiKeyPermissionResource
  label: string
  defaultActions: AuthApiKeyPermissionAction[]
  actions: AuthApiKeyPermissionAction[]
}> = [
  {
    resource: 'proxy',
    label: 'Proxy tokens',
    defaultActions: ['read', 'write', 'create', 'delete'],
    actions: ['read', 'write', 'create', 'delete'],
  },
]

const defaultPermissions = permissionRows.reduce<AuthApiKeyPermissions>((permissions, row) => {
  permissions[row.resource] = row.defaultActions
  return permissions
}, {})

function togglePermission(
  permissions: AuthApiKeyPermissions,
  resource: AuthApiKeyPermissionResource,
  action: AuthApiKeyPermissionAction,
  checked: boolean
): AuthApiKeyPermissions {
  const current = permissions[resource] ?? []
  const nextActions = checked
    ? Array.from(new Set([...current, action]))
    : current.filter((item) => item !== action)
  return {
    ...permissions,
    [resource]: nextActions,
  }
}

export function ApiKeyCreateForm({ onCreated }: ApiKeyCreateFormProps) {
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [permissions, setPermissions] = useState<AuthApiKeyPermissions>(defaultPermissions)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AuthCreateApiKeyResponse | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const trimmedName = name.trim()
      const response = await authApi.createApiKey({
        ...(trimmedName ? { name: trimmedName } : {}),
        permissions,
      })
      setResult(response)
      onCreated?.(response)
      toast.success('API key created. Copy it now; this is your only chance to see it.')
      setName('')
    } catch (submitError) {
      const message = getApiFriendlyMessage(submitError, 'Unable to create API key right now.')
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
        <div className="space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor="api-key-name"
          >
            Key name (optional)
          </label>
          <Input
            id="api-key-name"
            onChange={(event) => setName(event.target.value)}
            placeholder="work-laptop"
            value={name}
          />
        </div>

        <div className="rounded-md border border-border p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Recommended permissions</p>
              <p className="text-xs text-muted-foreground">
                Restrict this key to proxy token actions. Backend role checks still decide what the
                user is allowed to do.
              </p>
            </div>
            <Button
              onClick={() => setAdvancedOpen((current) => !current)}
              size="sm"
              type="button"
              variant="outline"
            >
              {advancedOpen ? 'Hide controls' : 'Fine-grained controls'}
            </Button>
          </div>

          {advancedOpen ? (
            <div className="mt-3 divide-y divide-border">
              {permissionRows.map((row) => (
                <div className="flex items-center justify-between gap-3 py-3" key={row.resource}>
                  <p className="text-sm">{row.label}</p>
                  <div className="flex items-center gap-4">
                    {row.actions.map((action) => (
                      <div className="flex items-center gap-2 text-xs capitalize" key={action}>
                        <Checkbox
                          checked={permissions[row.resource]?.includes(action) ?? false}
                          onCheckedChange={(checked) =>
                            setPermissions((current) =>
                              togglePermission(current, row.resource, action, checked)
                            )
                          }
                        />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <Button disabled={loading} type="submit">
          {loading ? 'Creating...' : 'Create API key'}
        </Button>

        <p className="text-xs text-muted-foreground">
          API keys are shown once. Save securely before leaving this page.
        </p>
      </form>

      {result ? (
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-medium">
            <StatusBadge tone="warning">Copy this key now</StatusBadge>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            It will not be displayed again after this response.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
            <code className="break-all text-sm">{result.key}</code>
            <CopyButton value={result.key} />
          </div>

          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p>Header: {result.headerName ?? 'x-pv-api-key'}</p>
            <p>Key ID: {result.apiKey?.id ?? 'n/a'}</p>
            <p>Start: {result.apiKey?.start ?? 'n/a'}</p>
            <p>Expires: {result.apiKey?.expiresAt ?? 'n/a'}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
