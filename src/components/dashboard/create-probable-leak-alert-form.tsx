'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateProbableLeakAlert } from '@/lib/hooks/use-security'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type CreateProbableLeakAlertFormProps = {
  projectId: string
}

export function CreateProbableLeakAlertForm({ projectId }: CreateProbableLeakAlertFormProps) {
  const createProbableLeakAlert = useCreateProbableLeakAlert(projectId)
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [provider, setProvider] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    const normalizedTitle = title.trim()
    const normalizedSummary = summary.trim()
    const normalizedProvider = provider.trim()

    if (!normalizedTitle || !normalizedSummary) {
      setError('Title and summary are required.')
      return
    }

    try {
      const payload = {
        source: 'manual',
        title: normalizedTitle,
        summary: normalizedSummary,
        ...(normalizedProvider ? { provider: normalizedProvider } : {}),
      }

      await createProbableLeakAlert.mutateAsync(payload)

      setTitle('')
      setSummary('')
      setProvider('')
      toast.success('Probable leak alert created.')
    } catch (createError) {
      setError(getApiFriendlyMessage(createError, 'Unable to create probable leak alert.'))
    }
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="alert-title"
        >
          Alert title
        </label>
        <Input
          id="alert-title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Potential token leak in CI logs"
          value={title}
        />
      </div>

      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="alert-summary"
        >
          Summary
        </label>
        <Input
          id="alert-summary"
          onChange={(event) => setSummary(event.target.value)}
          placeholder="Detected suspicious output containing token-like pattern"
          value={summary}
        />
      </div>

      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="alert-provider"
        >
          Provider (optional)
        </label>
        <Input
          id="alert-provider"
          onChange={(event) => setProvider(event.target.value)}
          placeholder="openai"
          value={provider}
        />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button disabled={createProbableLeakAlert.isPending} type="submit" variant="outline">
        {createProbableLeakAlert.isPending ? 'Creating...' : 'Create probable leak alert'}
      </Button>

      <p className="text-xs text-muted-foreground">
        Creating a probable-leak alert also generates an initial rotation recommendation.
      </p>
    </form>
  )
}
