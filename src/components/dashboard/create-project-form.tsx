'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateProject } from '@/lib/hooks/use-projects'
import { useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils/cn'
import { getApiFieldErrors, getApiFriendlyMessageWithRef } from '@/lib/utils/errors'

type CreateProjectFormProps = {
  onCreated?: () => void
}

function slugPreviewFromName(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'my-project'
  )
}

export function CreateProjectForm({ onCreated }: CreateProjectFormProps) {
  const createProject = useCreateProject()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})

    const normalizedName = name.trim()

    if (!normalizedName) {
      setFieldErrors({ name: 'Please enter a project name.' })
      return
    }

    try {
      await createProject.mutateAsync({ name: normalizedName })

      setName('')
      onCreated?.()
    } catch (submitError) {
      const fields = getApiFieldErrors(submitError)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        return
      }

      toast.error(
        getApiFriendlyMessageWithRef(submitError, 'Unable to create this project right now.')
      )
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
          className={cn(fieldErrors.name && 'border-danger focus-visible:ring-danger')}
          id="project-name"
          onChange={(event) => {
            setName(event.target.value)
            setFieldErrors((current) => ({ ...current, name: '' }))
          }}
          placeholder="My secure project"
          value={name}
        />
        <div className="flex items-center justify-between text-xs">
          <span className={fieldErrors.name ? 'text-danger' : 'text-muted-foreground'}>
            {fieldErrors.name || 'A unique URL will be generated automatically.'}
          </span>
          <span className={name.length > 100 ? 'text-danger' : 'text-muted-foreground'}>
            {name.length}/120
          </span>
        </div>
        {name.trim() ? (
          <p className="text-xs font-mono text-muted-foreground">
            URL preview: /{slugPreviewFromName(name)}
          </p>
        ) : null}
      </div>

      <Button disabled={createProject.isPending || !name.trim()} type="submit">
        {createProject.isPending ? 'Creating...' : 'Create project'}
      </Button>
    </form>
  )
}
