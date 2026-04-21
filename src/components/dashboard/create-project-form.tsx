'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCreateProject } from '@/lib/hooks/use-projects'
import { useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils/cn'
import {
  getApiErrorPayload,
  getApiFieldErrors,
  getApiFriendlyMessageWithRef,
} from '@/lib/utils/errors'

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
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [pendingSuggestedSlug, setPendingSuggestedSlug] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function closeSuggestedSlugDialog(): void {
    setPendingSuggestedSlug(null)
  }

  function applySuggestedSlug(): void {
    if (!pendingSuggestedSlug) {
      return
    }

    setSlug(pendingSuggestedSlug)
    closeSuggestedSlugDialog()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})

    const normalizedName = name.trim()
    const normalizedSlug = normalizeSlugInput(slug)

    if (!normalizedName) {
      setFieldErrors({ name: 'Please enter a project name.' })
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
      setPendingSuggestedSlug(null)
      onCreated?.()
    } catch (submitError) {
      const fields = getApiFieldErrors(submitError)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        return
      }

      const apiError = getApiErrorPayload(submitError)

      if (apiError?.code === 'PROJECT_SLUG_CONFLICT' && apiError.suggestedSlug && normalizedSlug) {
        setPendingSuggestedSlug(apiError.suggestedSlug)
        return
      }

      if (apiError?.code === 'PROJECT_SLUG_CONFLICT') {
        toast.error(
          apiError.error || 'That project slug is already in use. Choose a different slug.'
        )
        return
      }

      if (apiError?.code === 'PROJECT_CREATE_FAILURE' && apiError.error) {
        const isGenericServerMessage = apiError.error.startsWith('Unable to create project')
        if (!isGenericServerMessage) {
          toast.error(apiError.error)
          return
        }

        if (apiError.requestId) {
          toast.error(`Project creation failed. Please try again. (ref: ${apiError.requestId})`)
          return
        }
      }

      toast.error(
        getApiFriendlyMessageWithRef(submitError, 'Unable to create this project right now.')
      )
    }
  }

  return (
    <>
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
              {fieldErrors.name || 'Use a short, descriptive project name.'}
            </span>
            <span className={name.length > 100 ? 'text-danger' : 'text-muted-foreground'}>
              {name.length}/120
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor="project-slug"
          >
            Slug (optional)
          </label>
          <Input
            className={cn(fieldErrors.slug && 'border-danger focus-visible:ring-danger')}
            id="project-slug"
            onChange={(event) => {
              setSlug(event.target.value)
              setFieldErrors((current) => ({ ...current, slug: '' }))
            }}
            placeholder="my-secure-project"
            value={slug}
          />
          <p className={cn('text-xs', fieldErrors.slug ? 'text-danger' : 'text-muted-foreground')}>
            {fieldErrors.slug ||
              'Slug may include lowercase letters, numbers, and hyphens. Leave it blank to auto-generate one.'}
          </p>
        </div>

        <Button disabled={createProject.isPending} type="submit">
          {createProject.isPending ? 'Creating...' : 'Create project'}
        </Button>

        <p className="text-xs text-muted-foreground">
          Slug is optional. If omitted, backend may derive one from project name.
        </p>
      </form>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            closeSuggestedSlugDialog()
          }
        }}
        open={Boolean(pendingSuggestedSlug)}
      >
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/45" />
          <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5">
            <DialogTitle className="text-xl">Use suggested slug?</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              The slug <span className="font-mono text-foreground">{slug}</span> is already taken.
              Use <span className="font-mono text-foreground">{pendingSuggestedSlug}</span> instead?
            </DialogDescription>

            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={closeSuggestedSlugDialog} size="sm" type="button" variant="outline">
                Cancel
              </Button>
              <Button onClick={applySuggestedSlug} size="sm" type="button">
                Use suggested slug
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  )
}
