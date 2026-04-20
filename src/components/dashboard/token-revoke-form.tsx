'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/lib/hooks/use-toast'
import { useTokens } from '@/lib/hooks/use-tokens'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

export function TokenRevokeForm() {
  const tokens = useTokens()
  const { toast } = useToast()

  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    const normalizedToken = token.trim()
    if (!normalizedToken) {
      setError('Token is required.')
      return
    }

    try {
      const result = await tokens.revokeToken.mutateAsync({ token: normalizedToken })
      toast.success(
        result.alreadyRevoked ? 'Token was already revoked.' : 'Token revoked successfully.'
      )
      setToken('')
    } catch (submitError) {
      const message = getApiFriendlyMessage(submitError, 'Unable to revoke token right now.')
      setError(message)
      toast.error(message)
    }
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="revoke-token"
        >
          Full token value
        </label>
        <Input
          id="revoke-token"
          onChange={(event) => setToken(event.target.value)}
          placeholder="pv_tok_..."
          value={token}
        />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button disabled={tokens.revokeToken.isPending} type="submit" variant="danger">
        {tokens.revokeToken.isPending ? 'Revoking...' : 'Revoke token'}
      </Button>
    </form>
  )
}
