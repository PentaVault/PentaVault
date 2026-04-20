'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateProject } from '@/lib/hooks/use-projects'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type CreateProjectFormProps = {
  onCreated?: () => void
}

function normalizeSlugInput(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function CreateProjectForm({ onCreated }: CreateProjectFormProps) {
  const createProject = useCreateProject()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    const normalizedName = name.trim()
    const normalizedSlug = normalizeSlugInput(slug)

    if (!normalizedName) {
      setError('Project name is required.')
      return
    }

    try {
      const payload = {
        name: normalizedName,
        ...(normalizedSlug ? { slug: normalizedSlug } : {}),
      }

      await createProject.mutateAsync(payload)

      setName('')
      setSlug('')
      onCreated?.()
    } catch (submitError) {
      setError(getApiFriendlyMessage(submitError, 'Unable to create project right now.'))
    }
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="project-name"
        >
          Project name
        </label>
        <Input
          id="project-name"
          onChange={(event) => setName(event.target.value)}
          placeholder="My secure project"
          value={name}
        />
      </div>

      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="project-slug"
        >
          Slug (optional)
        </label>
        <Input
          id="project-slug"
          onChange={(event) => setSlug(event.target.value)}
          placeholder="my-secure-project"
          value={slug}
        />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button disabled={createProject.isPending} type="submit">
        {createProject.isPending ? 'Creating...' : 'Create project'}
      </Button>

      <p className="text-xs text-muted-foreground">
        Slug is optional. If omitted, backend may derive one from project name.
      </p>
    </form>
  )
}
