'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SECRET_MODES } from '@/lib/constants'
import { useToast } from '@/lib/hooks/use-toast'
import { useTokens } from '@/lib/hooks/use-tokens'
import type { SecretMode } from '@/lib/types/models'
import { cn } from '@/lib/utils/cn'
import { getApiFieldErrors, getApiFriendlyMessageWithRef } from '@/lib/utils/errors'

type TokenIssueFormProps = {
  onIssued?: (payload: {
    token: string
    tokenStart: string
    expiresAt: string
    mode: SecretMode
  }) => void
}

export function TokenIssueForm({ onIssued }: TokenIssueFormProps) {
  const tokens = useTokens()
  const { toast } = useToast()

  const [secretId, setSecretId] = useState('')
  const [mode, setMode] = useState<SecretMode>('compatibility')
  const [expiresAt, setExpiresAt] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})

    const normalizedSecretId = secretId.trim()
    const normalizedExpiresAt = expiresAt.trim()

    if (!normalizedSecretId) {
      setFieldErrors({ secretId: 'Please enter the secret ID you want to issue a token for.' })
      return
    }

    if (normalizedExpiresAt && Number.isNaN(Date.parse(normalizedExpiresAt))) {
      setFieldErrors({ expiresAt: 'Please enter a valid future ISO timestamp.' })
      return
    }

    try {
      const result = await tokens.issueToken.mutateAsync({
        secretId: normalizedSecretId,
        mode,
        ...(normalizedExpiresAt ? { expiresAt: normalizedExpiresAt } : {}),
      })

      toast.success('Token issued successfully.')
      onIssued?.({
        token: result.token,
        tokenStart: result.tokenStart,
        expiresAt: result.expiresAt,
        mode: result.mode,
      })
      setSecretId('')
      setExpiresAt('')
    } catch (submitError) {
      const fields = getApiFieldErrors(submitError)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        return
      }

      const message = getApiFriendlyMessageWithRef(
        submitError,
        'Unable to issue this token right now.'
      )
      toast.error(message)
    }
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="token-secret-id"
        >
          Secret ID
        </label>
        <Input
          className={cn(fieldErrors.secretId && 'border-danger focus-visible:ring-danger')}
          id="token-secret-id"
          onChange={(event) => {
            setSecretId(event.target.value)
            setFieldErrors((current) => ({ ...current, secretId: '' }))
          }}
          placeholder="secret_xxxxx"
          value={secretId}
        />
        {fieldErrors.secretId ? (
          <p className="text-sm text-danger">{fieldErrors.secretId}</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor="token-mode"
          >
            Mode
          </label>
          <Select onValueChange={(value) => setMode(value as SecretMode)} value={mode}>
            <SelectTrigger aria-label="Token mode" id="token-mode">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {SECRET_MODES.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {entry}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor="token-expires-at"
          >
            Expires at (optional ISO timestamp)
          </label>
          <Input
            className={cn(fieldErrors.expiresAt && 'border-danger focus-visible:ring-danger')}
            id="token-expires-at"
            onChange={(event) => {
              setExpiresAt(event.target.value)
              setFieldErrors((current) => ({ ...current, expiresAt: '' }))
            }}
            placeholder="2026-12-31T23:59:59.000Z"
            value={expiresAt}
          />
          {fieldErrors.expiresAt ? (
            <p className="text-sm text-danger">{fieldErrors.expiresAt}</p>
          ) : null}
        </div>
      </div>

      <Button disabled={tokens.issueToken.isPending} type="submit">
        {tokens.issueToken.isPending ? 'Issuing...' : 'Issue token'}
      </Button>

      <p className="text-xs text-muted-foreground">
        Use `compatibility` for `/resolve-bulk` workflows and `gateway` for provider proxy requests.
      </p>
    </form>
  )
}
