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
import { getApiFriendlyMessage } from '@/lib/utils/errors'

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
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    const normalizedName = name.trim()
    const normalizedValue = plaintext.trim()
    const normalizedEnvironment = environment.trim()

    if (!normalizedName || !normalizedValue || !normalizedEnvironment) {
      setError('Name, plaintext value, and environment are required.')
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
      const message = getApiFriendlyMessage(submitError, 'Unable to create secret right now.')
      setError(message)
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
            id="secret-name"
            onChange={(event) => setName(event.target.value)}
            placeholder="OPENAI_API_KEY"
            value={name}
          />
        </div>

        <div className="space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor="secret-environment"
          >
            Environment
          </label>
          <Input
            id="secret-environment"
            onChange={(event) => setEnvironment(event.target.value)}
            placeholder="development"
            value={environment}
          />
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
          id="secret-plaintext"
          onChange={(event) => setPlaintext(event.target.value)}
          placeholder="Paste value once"
          type="password"
          value={plaintext}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Store plaintext only on submit. It will not be shown again after successful creation.
      </p>

      <p className="text-xs text-muted-foreground">
        Compatibility mode supports resolve endpoints; gateway mode supports provider-proxy
        forwarding.
      </p>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button disabled={secrets.createSecret.isPending} type="submit">
        {secrets.createSecret.isPending ? 'Creating...' : 'Create secret'}
      </Button>
    </form>
  )
}
