'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { Archive, Lock, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
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
  useCreateProject,
  useCreateProjectAccessRequest,
  useDeleteProject,
  useProjectsQuery,
  useUnarchiveProject,
  useUpdateProject,
} from '@/lib/hooks/use-projects'
import { useToast } from '@/lib/hooks/use-toast'
import type { Project, ProjectRole, ProjectStatus, UserProject } from '@/lib/types/models'
import { cn } from '@/lib/utils/cn'
import {
  getApiErrorPayload,
  getApiFriendlyMessage,
  getApiFriendlyMessageWithRef,
} from '@/lib/utils/errors'

function roleTone(role: ProjectRole | string) {
  return role === 'owner' ? 'warning' : role === 'admin' ? 'success' : 'neutral'
}

function statusTone(status: ProjectStatus) {
  return status === 'active' ? 'success' : 'warning'
}

function slugPreviewFromName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 80) || 'project'
  )
}

function projectHref(projectId: string, activeOrgId: string | null): string {
  return activeOrgId ? getOrgProjectPath(activeOrgId, projectId) : getProjectPath(projectId)
}

function formatRetryAfter(seconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(seconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }

  return `${remainingSeconds}s`
}

export default function ProjectsPage() {
  const router = useRouter()
  const params = useParams<{ orgId?: string }>()
  const pathname = usePathname()
  const projectsQuery = useProjectsQuery()
  const createProject = useCreateProject()
  const createAccessRequest = useCreateProjectAccessRequest()
  const updateProject = useUpdateProject()
  const archiveProject = useArchiveProject()
  const unarchiveProject = useUnarchiveProject()
  const deleteProject = useDeleteProject()
  const auth = useAuth()
  const { toast } = useToast()

  const activeOrgId = auth.activeOrganization?.organization.id ?? null
  const orgScopedProjectsRoute = Boolean(params.orgId) || pathname.startsWith('/dashboard/org/')
  const orgIdForProjectUrls = orgScopedProjectsRoute ? (params.orgId ?? activeOrgId) : null
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [renameTarget, setRenameTarget] = useState<Project | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')

  const projects = useMemo(() => projectsQuery.data?.projects ?? [], [projectsQuery.data?.projects])
  const activeProjects = useMemo(
    () => projects.filter((item) => item.project.status === 'active'),
    [projects]
  )
  const archivedProjects = useMemo(
    () => projects.filter((item) => item.project.status === 'archived'),
    [projects]
  )
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return activeProjects
    }

    const query = searchQuery.toLowerCase()
    return activeProjects.filter(
      (item) =>
        item.project.name.toLowerCase().includes(query) ||
        item.project.slug.toLowerCase().includes(query)
    )
  }, [activeProjects, searchQuery])

  const anySelected = selectedIds.size > 0

  function handleSelect(id: string, checked: boolean): void {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  function handleSelectAll(): void {
    setSelectedIds(
      new Set(filteredProjects.filter((item) => item.canAccess).map((item) => item.project.id))
    )
  }

  function handleDeselectAll(): void {
    setSelectedIds(new Set())
  }

  function openRenameDialog(project: Project): void {
    setRenameTarget(project)
    setRenameValue(project.name)
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const normalizedName = name.trim()

    if (!normalizedName) {
      return
    }

    try {
      await createProject.mutateAsync({ name: normalizedName })
      setName('')
      setIsCreateOpen(false)
      toast.success('Project created successfully.')
    } catch (error) {
      toast.error(getApiFriendlyMessageWithRef(error, 'Unable to create this project right now.'))
    }
  }

  async function handleRename(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const normalizedName = renameValue.trim()
    if (!renameTarget || !normalizedName) {
      return
    }

    try {
      await updateProject.mutateAsync({
        projectId: renameTarget.id,
        input: { name: normalizedName },
      })
      setRenameTarget(null)
      setRenameValue('')
      toast.success('Project renamed.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to rename project right now.'))
    }
  }

  async function handleArchive(projectId: string): Promise<void> {
    try {
      await archiveProject.mutateAsync(projectId)
      handleSelect(projectId, false)
      toast.success('Project archived.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to archive project right now.'))
    }
  }

  async function handleBulkArchive(): Promise<void> {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      return
    }

    try {
      await Promise.all(ids.map((projectId) => archiveProject.mutateAsync(projectId)))
      setSelectedIds(new Set())
      toast.success(`Archived ${ids.length} project${ids.length === 1 ? '' : 's'}.`)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to archive selected projects right now.'))
    }
  }

  async function handleDeleteConfirmed(projectId: string | undefined): Promise<void> {
    if (!projectId) {
      return
    }

    try {
      await deleteProject.mutateAsync(projectId)
      setDeleteTarget(null)
      handleSelect(projectId, false)
      toast.success('Project deleted.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to delete project right now.'))
    }
  }

  async function handleBulkDeleteConfirmed(): Promise<void> {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      return
    }

    try {
      await Promise.all(ids.map((projectId) => deleteProject.mutateAsync(projectId)))
      setSelectedIds(new Set())
      setIsBulkDeleteOpen(false)
      toast.success(`Deleted ${ids.length} project${ids.length === 1 ? '' : 's'}.`)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to delete selected projects right now.'))
    }
  }

  async function handleRequestAccess(projectId: string): Promise<void> {
    try {
      await createAccessRequest.mutateAsync({
        projectId,
        input: {
          requestedRole: 'developer',
        },
      })
      toast.success("Access request sent. You'll be notified when it's reviewed.")
    } catch (error) {
      const payload = getApiErrorPayload(error)
      if (
        payload?.code === 'PROJECT_ACCESS_REQUEST_RETRY_COOLDOWN' &&
        typeof payload.retryAfter === 'number'
      ) {
        toast.error(`Please wait ${formatRetryAfter(payload.retryAfter)} before requesting again.`)
        return
      }

      toast.error(getApiFriendlyMessage(error, 'Unable to request access right now.'))
    }
  }

  async function handleUnarchive(projectId: string): Promise<void> {
    try {
      await unarchiveProject.mutateAsync(projectId)
      toast.success('Project restored.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to restore project right now.'))
    }
  }

  if (projectsQuery.isLoading) {
    return (
      <PageWrapper>
        <div className="space-y-3">
          <div className="h-10 animate-pulse rounded-md border border-border bg-card" />
          <div className="h-20 animate-pulse rounded-lg border border-border bg-card" />
          <div className="h-20 animate-pulse rounded-lg border border-border bg-card" />
        </div>
      </PageWrapper>
    )
  }

  if (projectsQuery.isError) {
    return (
      <PageWrapper>
        <ErrorState
          title="Unable to load projects"
          message={getApiFriendlyMessage(projectsQuery.error, 'Please try again in a moment.')}
          onRetry={() => void projectsQuery.refetch()}
        />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search projects..."
            value={searchQuery}
          />
        </div>

        <Button className="flex-shrink-0" onClick={() => setIsCreateOpen(true)} type="button">
          <Plus className="mr-2 h-4 w-4" />
          New project
        </Button>
      </div>

      {anySelected ? (
        <div className="mt-3 flex items-center gap-3 rounded-md border border-border bg-background-secondary px-3 py-2">
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={handleDeselectAll}
            type="button"
          >
            <X className="h-3.5 w-3.5" />
            Deselect all
          </button>
          <span className="text-border">|</span>
          <button
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={handleSelectAll}
            type="button"
          >
            Select all ({filteredProjects.filter((item) => item.canAccess).length})
          </button>
          <span className="text-border">|</span>
          <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>

          <div className="ml-auto flex items-center gap-2">
            <Button
              className="px-3 text-xs"
              onClick={() => void handleBulkArchive()}
              size="sm"
              type="button"
              variant="outline"
            >
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              Archive
            </Button>
            <Button
              className="px-3 text-xs"
              onClick={() => setIsBulkDeleteOpen(true)}
              size="sm"
              type="button"
              variant="danger"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {filteredProjects.length === 0 ? (
          <EmptyState
            title={searchQuery.trim() ? 'No matching projects' : 'No projects yet'}
            description={
              searchQuery.trim()
                ? 'Try a different project name or search term.'
                : 'Create your first project to start configuring secrets and runtime access.'
            }
          />
        ) : (
          filteredProjects.map((projectItem) => (
            <ProjectCard
              anySelected={anySelected}
              isSelected={selectedIds.has(projectItem.project.id)}
              key={projectItem.project.id}
              onArchive={() => void handleArchive(projectItem.project.id)}
              onDelete={() => setDeleteTarget(projectItem.project)}
              onOpen={() => router.push(projectHref(projectItem.project.id, orgIdForProjectUrls))}
              onRename={() => openRenameDialog(projectItem.project)}
              onRequestAccess={handleRequestAccess}
              onSelect={handleSelect}
              projectItem={projectItem}
              requestPending={createAccessRequest.isPending}
            />
          ))
        )}
      </div>

      <div className="fixed right-6 bottom-6 z-10">
        <Button
          className="border-border-strong bg-background-deep"
          onClick={() => setIsArchiveOpen(true)}
          size="sm"
          title="Archived projects"
          type="button"
          variant="outline"
        >
          <Archive className="mr-2 h-4 w-4" />
          Archive
          {archivedProjects.length > 0 ? (
            <span className="ml-1 text-xs text-muted-foreground">({archivedProjects.length})</span>
          ) : null}
        </Button>
      </div>

      <ProjectCreateDialog
        createPending={createProject.isPending}
        name={name}
        onCreate={handleCreate}
        onNameChange={setName}
        onOpenChange={setIsCreateOpen}
        open={isCreateOpen}
      />

      <ProjectRenameDialog
        isPending={updateProject.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null)
            setRenameValue('')
          }
        }}
        onRename={handleRename}
        open={Boolean(renameTarget)}
        project={renameTarget}
        value={renameValue}
        onValueChange={setRenameValue}
      />

      <ArchiveDialog
        archivedProjects={archivedProjects}
        deletePending={deleteProject.isPending}
        onDelete={(project) => setDeleteTarget(project)}
        onOpenChange={setIsArchiveOpen}
        onRestore={(projectId) => void handleUnarchive(projectId)}
        open={isArchiveOpen}
        restorePending={unarchiveProject.isPending}
      />

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        open={Boolean(deleteTarget)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this project and all its data including secrets, tokens,
            and audit logs. This action cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteProject.isPending}
              onClick={() => void handleDeleteConfirmed(deleteTarget?.id)}
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog onOpenChange={setIsBulkDeleteOpen} open={isBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete {selectedIds.size} projects?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete {selectedIds.size} projects and all their data. This action
            cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteProject.isPending}
              onClick={() => void handleBulkDeleteConfirmed()}
            >
              Delete {selectedIds.size} projects
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  )
}

function ProjectCreateDialog({
  createPending,
  name,
  onCreate,
  onNameChange,
  onOpenChange,
  open,
}: {
  createPending: boolean
  name: string
  onCreate: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onNameChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/45" />
        <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5">
          <DialogTitle className="text-lg font-medium">Create project</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Give your project a name. A unique URL will be generated automatically.
          </DialogDescription>

          <form className="mt-4 space-y-4" onSubmit={(event) => void onCreate(event)}>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="project-name">
                Project name
              </label>
              <Input
                autoFocus
                id="project-name"
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="My API project"
                value={name}
              />
              {name.trim() ? (
                <p className="text-xs font-mono text-muted-foreground">
                  URL: /{slugPreviewFromName(name)}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => onOpenChange(false)} size="sm" type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={!name.trim() || createPending} size="sm" type="submit">
                {createPending ? 'Creating...' : 'Create project'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

function ProjectRenameDialog({
  isPending,
  onOpenChange,
  onRename,
  onValueChange,
  open,
  project,
  value,
}: {
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onRename: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onValueChange: (value: string) => void
  open: boolean
  project: Project | null
  value: string
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/45" />
        <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5">
          <DialogTitle className="text-lg font-medium">Rename project</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            The project URL stays the same.
          </DialogDescription>

          <form className="mt-4 space-y-4" onSubmit={(event) => void onRename(event)}>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="rename-project-name">
                Project name
              </label>
              <Input
                autoFocus
                id="rename-project-name"
                onChange={(event) => onValueChange(event.target.value)}
                placeholder={project?.name ?? 'Project name'}
                value={value}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => onOpenChange(false)} size="sm" type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={!value.trim() || isPending} size="sm" type="submit">
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

function ArchiveDialog({
  archivedProjects,
  deletePending,
  onDelete,
  onOpenChange,
  onRestore,
  open,
  restorePending,
}: {
  archivedProjects: UserProject[]
  deletePending: boolean
  onDelete: (project: Project) => void
  onOpenChange: (open: boolean) => void
  onRestore: (projectId: string) => void
  open: boolean
  restorePending: boolean
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/45" />
        <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-lg font-medium">Archived projects</DialogTitle>
            <DialogClose asChild>
              <Button
                aria-label="Close archived projects"
                className="h-7 w-7 p-0"
                type="button"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
          {archivedProjects.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No archived projects.</p>
          ) : (
            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {archivedProjects.map((item) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                  key={item.project.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.project.name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      /{item.project.slug}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <Button
                      disabled={restorePending}
                      onClick={() => onRestore(item.project.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Restore
                    </Button>
                    <Button
                      disabled={deletePending}
                      onClick={() => onDelete(item.project)}
                      size="sm"
                      type="button"
                      variant="danger"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

function ProjectCard({
  anySelected,
  isSelected,
  onArchive,
  onDelete,
  onOpen,
  onRename,
  onRequestAccess,
  onSelect,
  projectItem,
  requestPending,
}: {
  anySelected: boolean
  isSelected: boolean
  onArchive: () => void
  onDelete: () => void
  onOpen: () => void
  onRename: () => void
  onRequestAccess: (projectId: string) => Promise<void>
  onSelect: (id: string, checked: boolean) => void
  projectItem: UserProject
  requestPending: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const {
    project,
    membership,
    canAccess,
    canRequestAccess,
    pendingAccessRequest,
    latestRequestStatus,
  } = projectItem
  const roleLabel = projectItem.effectiveRole ?? membership?.role ?? projectItem.orgRole
  const showCheckbox = canAccess && (hovered || anySelected || isSelected)

  if (!canAccess) {
    return (
      <div className="rounded-lg border border-border/70 bg-card/50 p-4 opacity-85">
        <ProjectCardContent projectItem={projectItem} />
        <div className="mt-3 flex justify-end">
          {pendingAccessRequest ? (
            <StatusBadge tone="warning">Request pending</StatusBadge>
          ) : canRequestAccess !== false ? (
            <Button
              disabled={requestPending}
              onClick={() => void onRequestAccess(project.id)}
              size="sm"
              type="button"
              variant="outline"
            >
              {latestRequestStatus === 'denied' ? 'Request access again' : 'Request access'}
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
        isSelected
          ? 'border-accent/50 bg-accent/8'
          : 'border-border bg-card hover:border-border-strong hover:bg-card-elevated'
      )}
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={cn('transition-opacity', showCheckbox ? 'opacity-100' : 'opacity-0')}
        onClick={(event) => event.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(project.id, checked)}
        />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{project.name}</h3>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">/{project.slug}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <StatusBadge tone={roleTone(roleLabel)}>{roleLabel}</StatusBadge>
          <StatusBadge className="capitalize" tone={statusTone(project.status)}>
            {project.status}
          </StatusBadge>
          <ProjectCardMenu onArchive={onArchive} onDelete={onDelete} onRename={onRename} />
        </div>
      </div>
    </div>
  )
}

function ProjectCardContent({ projectItem }: { projectItem: UserProject }) {
  const { project, canAccess } = projectItem
  const roleLabel = projectItem.effectiveRole ?? projectItem.membership?.role ?? projectItem.orgRole

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {!canAccess ? <Lock className="h-4 w-4 text-muted-foreground" /> : null}
          <h3 className="truncate text-sm font-medium">{project.name}</h3>
        </div>
        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">/{project.slug}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <StatusBadge tone={roleTone(roleLabel)}>{roleLabel}</StatusBadge>
        <StatusBadge className="capitalize" tone={statusTone(project.status)}>
          {project.status}
        </StatusBadge>
      </div>
    </div>
  )
}

function ProjectCardMenu({
  onArchive,
  onDelete,
  onRename,
}: {
  onArchive: () => void
  onDelete: () => void
  onRename: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(event) => event.stopPropagation()}
          size="sm"
          type="button"
          variant="ghost"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuItem onSelect={onRename}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onArchive}>
          <Archive className="mr-2 h-3.5 w-3.5" />
          Archive
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-danger" onSelect={onDelete}>
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
