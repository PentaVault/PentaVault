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

type SecretCreateFormProps = {
  projectId: string
}

export function SecretCreateForm({ projectId }: SecretCreateFormProps) {
  const secrets = useSecrets()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [plaintext, setPlaintext] = useState('')
  const [environment, setEnvironment] = useState('development')
  const [mode, setMode] = useState<SecretMode>('compatibility')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})

    const normalizedName = name.trim()
    const normalizedValue = plaintext.trim()
    const normalizedEnvironment = environment.trim()

    const nextFieldErrors: Record<string, string> = {}

    if (!normalizedName) {
      nextFieldErrors.name = 'Please enter a secret name.'
    } else if (!/^[A-Z0-9_]+$/.test(normalizedName)) {
      nextFieldErrors.name = 'Use uppercase letters, numbers, and underscores, like STRIPE_API_KEY.'
    }

    if (!normalizedEnvironment) {
      nextFieldErrors.environment = 'Please enter an environment name.'
    }

    if (!normalizedValue) {
      nextFieldErrors.plaintext = 'Please paste the secret value you want to store.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    try {
      await secrets.createSecret.mutateAsync({
        projectId,
        name: normalizedName,
        plaintext: normalizedValue,
        environment: normalizedEnvironment,
        mode,
      })

      toast.success('Secret created successfully.')
      setName('')
      setPlaintext('')
    } catch (submitError) {
      const fields = getApiFieldErrors(submitError)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        return
      }

      const message = getApiFriendlyMessageWithRef(
        submitError,
        'Unable to create this secret right now.'
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
            htmlFor="secret-name"
          >
            Secret name
          </label>
          <Input
            className={cn(fieldErrors.name && 'border-danger focus-visible:ring-danger')}
            id="secret-name"
            onChange={(event) => {
              setName(event.target.value)
              setFieldErrors((current) => ({ ...current, name: '' }))
            }}
            placeholder="OPENAI_API_KEY"
            value={name}
          />
          {fieldErrors.name ? <p className="text-sm text-danger">{fieldErrors.name}</p> : null}
        </div>

        <div className="space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor="secret-environment"
          >
            Environment
          </label>
          <Input
            className={cn(fieldErrors.environment && 'border-danger focus-visible:ring-danger')}
            id="secret-environment"
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
      </div>

      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="secret-mode"
        >
          Mode
        </label>
        <Select onValueChange={(value) => setMode(value as SecretMode)} value={mode}>
          <SelectTrigger aria-label="Secret mode" id="secret-mode">
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
          htmlFor="secret-plaintext"
        >
          Plaintext value
        </label>
        <Input
          className={cn(fieldErrors.plaintext && 'border-danger focus-visible:ring-danger')}
          id="secret-plaintext"
          onChange={(event) => {
            setPlaintext(event.target.value)
            setFieldErrors((current) => ({ ...current, plaintext: '' }))
          }}
          placeholder="Paste value once"
          type="password"
          value={plaintext}
        />
        {fieldErrors.plaintext ? (
          <p className="text-sm text-danger">{fieldErrors.plaintext}</p>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Store plaintext only on submit. It will not be shown again after successful creation.
      </p>

      <p className="text-xs text-muted-foreground">
        Compatibility mode supports resolve endpoints; gateway mode supports provider-proxy
        forwarding.
      </p>

      <Button disabled={secrets.createSecret.isPending} type="submit">
        {secrets.createSecret.isPending ? 'Creating...' : 'Create secret'}
      </Button>
    </form>
  )
}
