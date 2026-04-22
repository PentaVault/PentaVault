'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { Archive, Lock, Plus, Search } from 'lucide-react'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { StatusBadge } from '@/components/ui/badge'
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
import { getOrgProjectPath, getProjectPath } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import {
  useCreateProject,
  useCreateProjectAccessRequest,
  useDeleteProject,
  useProjectsQuery,
  useUnarchiveProject,
} from '@/lib/hooks/use-projects'
import { useToast } from '@/lib/hooks/use-toast'
import type { ProjectRole, ProjectStatus, UserProject } from '@/lib/types/models'
import { getApiFriendlyMessage, getApiFriendlyMessageWithRef } from '@/lib/utils/errors'

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

export default function ProjectsPage() {
  const projectsQuery = useProjectsQuery()
  const createProject = useCreateProject()
  const createAccessRequest = useCreateProjectAccessRequest()
  const unarchiveProject = useUnarchiveProject()
  const deleteProject = useDeleteProject()
  const auth = useAuth()
  const { toast } = useToast()

  const activeOrgId = auth.activeOrganization?.organization.id ?? null
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
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

  async function handleDeleteFromArchive(projectId: string): Promise<void> {
    try {
      await deleteProject.mutateAsync(projectId)
      toast.success('Project deleted.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to delete project right now.'))
    }
  }

  if (projectsQuery.isLoading) {
    return (
      <PageWrapper>
        <div className="space-y-3">
          <div className="h-10 max-w-sm animate-pulse rounded-md border border-border bg-card" />
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
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search projects..."
            value={searchQuery}
          />
        </div>

        <Button onClick={() => setIsCreateOpen(true)} type="button">
          <Plus className="mr-2 h-4 w-4" />
          New project
        </Button>
      </div>

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
              activeOrgId={activeOrgId}
              key={projectItem.project.id}
              onRequestAccess={handleRequestAccess}
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

      <Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/45" />
          <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5">
            <DialogTitle className="text-lg font-medium">Create project</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Give your project a name. A unique URL will be generated automatically.
            </DialogDescription>

            <form className="mt-4 space-y-4" onSubmit={(event) => void handleCreate(event)}>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor="project-name">
                  Project name
                </label>
                <Input
                  autoFocus
                  id="project-name"
                  onChange={(event) => setName(event.target.value)}
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
                <Button
                  onClick={() => setIsCreateOpen(false)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={!name.trim() || createProject.isPending} size="sm" type="submit">
                  {createProject.isPending ? 'Creating...' : 'Create project'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <Dialog onOpenChange={setIsArchiveOpen} open={isArchiveOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/45" />
          <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5">
            <DialogTitle className="text-lg font-medium">Archived projects</DialogTitle>
            {archivedProjects.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No archived projects.
              </p>
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
                        disabled={unarchiveProject.isPending}
                        onClick={() => void handleUnarchive(item.project.id)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Restore
                      </Button>
                      <Button
                        disabled={deleteProject.isPending}
                        onClick={() => void handleDeleteFromArchive(item.project.id)}
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
    </PageWrapper>
  )
}

function ProjectCard({
  activeOrgId,
  onRequestAccess,
  projectItem,
  requestPending,
}: {
  activeOrgId: string | null
  onRequestAccess: (projectId: string) => Promise<void>
  projectItem: UserProject
  requestPending: boolean
}) {
  const { project, membership, canAccess, pendingAccessRequest, latestRequestStatus } = projectItem
  const roleLabel = membership?.role ?? projectItem.orgRole
  const content = (
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

  if (canAccess) {
    return (
      <Link
        className="block cursor-pointer rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong hover:bg-card-elevated"
        href={projectHref(project.id, activeOrgId)}
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="rounded-lg border border-border/70 bg-card/50 p-4 opacity-85">
      {content}
      <div className="mt-3 flex justify-end">
        {pendingAccessRequest ? (
          <StatusBadge tone="warning">Request pending</StatusBadge>
        ) : (
          <Button
            disabled={requestPending}
            onClick={() => void onRequestAccess(project.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            {latestRequestStatus === 'denied' ? 'Request access again' : 'Request access'}
          </Button>
        )}
      </div>
    </div>
  )
}
