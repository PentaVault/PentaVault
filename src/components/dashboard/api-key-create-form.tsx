'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

import { CopyButton } from '@/components/shared/copy-button'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/api/auth'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type ApiKeyResult = {
  key: string
  headerName?: string
  apiKey?: {
    id?: string | null
    name?: string | null
    start?: string | null
    expiresAt?: string | null
  }
}

export function ApiKeyCreateForm() {
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApiKeyResult | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const trimmedName = name.trim()
      const response = (await authApi.createApiKey(
        trimmedName ? { name: trimmedName } : {}
      )) as ApiKeyResult
      setResult(response)
      toast.success('Fallback API key created. Copy it now; this is your only chance to see it.')
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
            placeholder="work-laptop-fallback"
            value={name}
          />
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <Button disabled={loading} type="submit">
          {loading ? 'Creating...' : 'Create fallback API key'}
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
