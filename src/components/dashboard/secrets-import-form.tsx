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
import { useSecrets } from '@/lib/hooks/use-secrets'
import { useToast } from '@/lib/hooks/use-toast'
import type { SecretMode } from '@/lib/types/models'
import { cn } from '@/lib/utils/cn'
import { getApiFieldErrors, getApiFriendlyMessageWithRef } from '@/lib/utils/errors'

type SecretsImportFormProps = {
  projectId: string
}

function parseSecretsText(input: string): Record<string, string> {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))

  const secrets: Record<string, string> = {}

  for (const line of lines) {
    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()

    if (!key || !value) {
      continue
    }

    secrets[key] = value
  }

  return secrets
}

export function SecretsImportForm({ projectId }: SecretsImportFormProps) {
  const secrets = useSecrets()
  const { toast } = useToast()

  const [rawInput, setRawInput] = useState('')
  const [environment, setEnvironment] = useState('development')
  const [mode, setMode] = useState<SecretMode>('compatibility')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})

    const normalizedEnvironment = environment.trim()
    const parsedSecrets = parseSecretsText(rawInput)

    if (!normalizedEnvironment) {
      setFieldErrors({ environment: 'Please enter an environment name.' })
      return
    }

    if (Object.keys(parsedSecrets).length === 0) {
      setFieldErrors({ rawInput: 'Add at least one valid KEY=VALUE pair before importing.' })
      return
    }

    try {
      const result = await secrets.importSecrets.mutateAsync({
        projectId,
        environment: normalizedEnvironment,
        mode,
        issueTokens: true,
        secrets: parsedSecrets,
      })

      toast.success(
        `Imported ${result.imported.length} secret${result.imported.length === 1 ? '' : 's'}.`
      )
      setRawInput('')
    } catch (submitError) {
      const fields = getApiFieldErrors(submitError)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        return
      }

      const message = getApiFriendlyMessageWithRef(
        submitError,
        'Unable to import these secrets right now.'
      )
      toast.error(message)
    }
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor="import-environment"
          >
            Environment
          </label>
          <Input
            className={cn(fieldErrors.environment && 'border-danger focus-visible:ring-danger')}
            id="import-environment"
            onChange={(event) => {
              setEnvironment(event.target.value)
              setFieldErrors((current) => ({ ...current, environment: '' }))
            }}
            placeholder="development"
            value={environment}
          />
          {fieldErrors.environment ? (
            <p className="text-sm text-danger">{fieldErrors.environment}</p>
          ) : null}
        </div>

        <div className="space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor="import-mode"
          >
            Mode
          </label>
          <Select onValueChange={(value) => setMode(value as SecretMode)} value={mode}>
            <SelectTrigger aria-label="Import mode" id="import-mode">
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
      </div>

      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="import-body"
        >
          Bulk import (`KEY=value` per line)
        </label>
        <textarea
          id="import-body"
          value={rawInput}
          onChange={(event) => {
            setRawInput(event.target.value)
            setFieldErrors((current) => ({ ...current, rawInput: '', secrets: '' }))
          }}
          placeholder={'DATABASE_URL=postgres://...\nOPENAI_API_KEY=sk-...'}
          className={cn(
            'min-h-36 w-full rounded-md border border-border bg-background-elevated px-3 py-2 text-sm',
            (fieldErrors.rawInput || fieldErrors.secrets) && 'border-danger'
          )}
        />
        {fieldErrors.rawInput || fieldErrors.secrets ? (
          <p className="text-sm text-danger">{fieldErrors.rawInput || fieldErrors.secrets}</p>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Do not paste production secrets into screenshots, logs, or shared channels.
      </p>

      <p className="text-xs text-muted-foreground">
        Imported secrets can optionally issue tokens immediately for runtime onboarding.
      </p>

      <Button disabled={secrets.importSecrets.isPending} type="submit" variant="outline">
        {secrets.importSecrets.isPending ? 'Importing...' : 'Import secrets'}
      </Button>
    </form>
  )
}
