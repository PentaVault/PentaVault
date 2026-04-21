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
import { getApiErrorPayload, getApiFriendlyMessage } from '@/lib/utils/errors'

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

    const normalizedName = name.trim()
    const normalizedSlug = normalizeSlugInput(slug)

    if (!normalizedName) {
      toast.error('Project name is required.')
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

      if (apiError?.code === 'INVALID_REQUEST') {
        toast.error('Some project details are invalid. Check the name and slug and try again.')
        return
      }

      toast.error(getApiFriendlyMessage(submitError, 'Unable to create project. Please try again.'))
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
