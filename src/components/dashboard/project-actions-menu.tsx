'use client'

import Link from 'next/link'
import { useState } from 'react'

import axios from 'axios'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown'
import { Input } from '@/components/ui/input'
import { getOrgProjectPath, getProjectPath } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import {
  useArchiveProject,
  useDeleteProject,
  useUnarchiveProject,
  useUpdateProject,
} from '@/lib/hooks/use-projects'
import type { UserProject } from '@/lib/types/models'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type ProjectActionsMenuProps = {
  projectItem: UserProject
  onArchived?: () => void
}

function normalizeSlugInput(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function ProjectActionsMenu({ projectItem, onArchived }: ProjectActionsMenuProps) {
  const auth = useAuth()
  const updateProject = useUpdateProject()
  const archiveProject = useArchiveProject()
  const unarchiveProject = useUnarchiveProject()
  const deleteProject = useDeleteProject()

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [name, setName] = useState(projectItem.project.name)
  const [slug, setSlug] = useState(projectItem.project.slug)
  const [deleteSlugInput, setDeleteSlugInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isOwner = projectItem.membership?.role === 'owner'
  const activeOrgId = auth.activeOrganization?.organization.id ?? null

  async function handleSave(): Promise<void> {
    setError(null)

    const normalizedName = name.trim()
    const normalizedSlug = normalizeSlugInput(slug)

    if (!normalizedName) {
      setError('Project name is required.')
      return
    }

    try {
      await updateProject.mutateAsync({
        projectId: projectItem.project.id,
        input: {
          name: normalizedName,
          slug: normalizedSlug,
        },
      })
      setIsEditOpen(false)
    } catch (submitError) {
      setError(getApiFriendlyMessage(submitError, 'Unable to update project right now.'))
    }
  }

  async function handleArchiveToggle(): Promise<void> {
    setError(null)

    try {
      if (projectItem.project.status === 'archived') {
        await unarchiveProject.mutateAsync(projectItem.project.id)
      } else {
        await archiveProject.mutateAsync(projectItem.project.id)
      }
      onArchived?.()
    } catch (submitError) {
      const fallback =
        projectItem.project.status === 'archived'
          ? 'Unable to unarchive project right now.'
          : 'Unable to archive project right now.'
      setError(getApiFriendlyMessage(submitError, fallback))
    }
  }

  async function handleDelete(): Promise<void> {
    setError(null)

    if (deleteSlugInput.trim() !== projectItem.project.slug) {
      setError('Type the exact project slug to confirm deletion.')
      return
    }

    try {
      await deleteProject.mutateAsync(projectItem.project.id)
      setIsMenuOpen(false)
      setIsDeleteOpen(false)
      setDeleteSlugInput('')
      onArchived?.()
    } catch (submitError) {
      if (axios.isAxiosError(submitError)) {
        const status = submitError.response?.status
        const code = (submitError.response?.data as { code?: string } | undefined)?.code

        if (status === 404 || code === 'PROJECT_DELETE_FAILURE') {
          setIsMenuOpen(false)
          setIsDeleteOpen(false)
          setDeleteSlugInput('')
          onArchived?.()
          return
        }
      }

      setError(getApiFriendlyMessage(submitError, 'Unable to delete project right now.'))
    }
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu onOpenChange={setIsMenuOpen} open={isMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button className="h-8 px-3" size="sm" variant="outline">
            Manage
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link
              href={
                activeOrgId
                  ? getOrgProjectPath(activeOrgId, projectItem.project.id)
                  : getProjectPath(projectItem.project.id)
              }
            >
              Open
            </Link>
          </DropdownMenuItem>

          <Dialog onOpenChange={setIsEditOpen} open={isEditOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem
                disabled={!isOwner}
                onSelect={(event) => {
                  event.preventDefault()
                }}
              >
                Modify
              </DropdownMenuItem>
            </DialogTrigger>

            <DialogPortal>
              <DialogOverlay className="fixed inset-0 bg-black/45" />
              <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5">
                <DialogTitle className="text-xl">Modify project</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  Update project name or slug.
                </DialogDescription>

                <div className="mt-4 space-y-3">
                  <div className="space-y-1">
                    <label
                      className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                      htmlFor={`project-name-${projectItem.project.id}`}
                    >
                      Project name
                    </label>
                    <Input
                      id={`project-name-${projectItem.project.id}`}
                      onChange={(event) => setName(event.target.value)}
                      value={name}
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                      htmlFor={`project-slug-${projectItem.project.id}`}
                    >
                      Slug
                    </label>
                    <Input
                      id={`project-slug-${projectItem.project.id}`}
                      onChange={(event) => setSlug(event.target.value)}
                      value={slug}
                    />
                  </div>

                  {error ? <p className="text-sm text-danger">{error}</p> : null}

                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => setIsEditOpen(false)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={updateProject.isPending}
                      onClick={() => void handleSave()}
                      size="sm"
                      type="button"
                    >
                      {updateProject.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </DialogPortal>
          </Dialog>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            disabled={!isOwner || archiveProject.isPending || unarchiveProject.isPending}
            onSelect={(event) => {
              event.preventDefault()
              void handleArchiveToggle()
            }}
          >
            {projectItem.project.status === 'archived'
              ? unarchiveProject.isPending
                ? 'Unarchiving...'
                : 'Unarchive'
              : archiveProject.isPending
                ? 'Archiving...'
                : 'Archive'}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-danger hover:bg-danger/10"
            disabled={!isOwner || deleteProject.isPending}
            onSelect={(event) => {
              event.preventDefault()
              setError(null)
              setDeleteSlugInput('')
              setIsMenuOpen(false)
              setIsDeleteOpen(true)
            }}
          >
            {deleteProject.isPending ? 'Deleting...' : 'Delete'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        onOpenChange={(open) => {
          setIsDeleteOpen(open)
          if (!open) {
            setDeleteSlugInput('')
            setError(null)
          }
        }}
        open={isDeleteOpen}
      >
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/45" />
          <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-danger/45 bg-card p-5">
            <DialogTitle className="text-xl text-danger">Delete project permanently</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              This action is irreversible. Type{' '}
              <span className="font-mono text-foreground">{projectItem.project.slug}</span> to
              confirm permanent deletion.
            </DialogDescription>

            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <label
                  className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                  htmlFor={`project-delete-confirm-${projectItem.project.id}`}
                >
                  Confirm slug
                </label>
                <Input
                  id={`project-delete-confirm-${projectItem.project.id}`}
                  onChange={(event) => setDeleteSlugInput(event.target.value)}
                  placeholder={projectItem.project.slug}
                  value={deleteSlugInput}
                />
              </div>

              {error ? <p className="text-sm text-danger">{error}</p> : null}

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setIsDeleteOpen(false)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={
                    deleteProject.isPending || deleteSlugInput.trim() !== projectItem.project.slug
                  }
                  onClick={() => void handleDelete()}
                  size="sm"
                  type="button"
                  variant="danger"
                >
                  {deleteProject.isPending ? 'Deleting...' : 'Delete project'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  )
}
