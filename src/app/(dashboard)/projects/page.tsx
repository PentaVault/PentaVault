'use client'

import Link from 'next/link'

import { Lock } from 'lucide-react'

import { CreateProjectForm } from '@/components/dashboard/create-project-form'
import { ProjectActionsMenu } from '@/components/dashboard/project-actions-menu'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getOrgProjectPath, getProjectPath } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useCreateProjectAccessRequest, useProjectsQuery } from '@/lib/hooks/use-projects'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'
import { formatDateTime } from '@/lib/utils/format'

function projectStatusTone(status: 'active' | 'archived') {
  return status === 'active' ? 'success' : 'warning'
}

export default function ProjectsPage() {
  const projectsQuery = useProjectsQuery()
  const createAccessRequest = useCreateProjectAccessRequest()
  const auth = useAuth()
  const { toast } = useToast()
  const activeOrgId = auth.activeOrganization?.organization.id ?? null

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

  if (projectsQuery.isLoading) {
    return (
      <PageWrapper>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
              <CardDescription>Loading your workspace projects...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </PageWrapper>
    )
  }

  if (projectsQuery.isError) {
    return (
      <PageWrapper>
        <Card>
          <CardHeader>
            <CardTitle>Unable to load projects</CardTitle>
            <CardDescription>
              Try again in a moment. If this persists, check backend availability.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageWrapper>
    )
  }

  const projects = projectsQuery.data?.projects ?? []

  return (
    <PageWrapper>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>
              Projects are scoped workspaces for secrets, tokens, members, and audit activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No projects found yet. Create your first project to start configuring secrets and
                runtime access.
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((projectItem) => {
                  const {
                    project,
                    membership,
                    canAccess,
                    pendingAccessRequest,
                    latestRequestStatus,
                  } = projectItem

                  return (
                    <div
                      className={`rounded-xl border p-4 transition-colors ${
                        canAccess
                          ? 'border-border hover:border-border-strong hover:bg-card-elevated'
                          : 'border-border/70 bg-card/50 opacity-85'
                      }`}
                      key={project.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {canAccess ? (
                            <Link
                              className="text-lg tracking-[-0.16px] text-foreground hover:text-[#3ecf8e]"
                              href={
                                activeOrgId
                                  ? getOrgProjectPath(activeOrgId, project.id)
                                  : getProjectPath(project.id)
                              }
                            >
                              {project.name}
                            </Link>
                          ) : (
                            <div className="flex items-center gap-2 text-lg tracking-[-0.16px] text-foreground/90">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                              <span>{project.name}</span>
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground">/{project.slug}</p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {membership ? (
                            <StatusBadge tone="neutral">{membership.role}</StatusBadge>
                          ) : (
                            <StatusBadge tone="neutral">{project.visibility}</StatusBadge>
                          )}
                          <StatusBadge
                            tone={projectStatusTone(project.status)}
                            className="capitalize"
                          >
                            {project.status}
                          </StatusBadge>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Updated {formatDateTime(project.updatedAt)}
                      </p>
                      <div className="mt-3 flex justify-end">
                        {canAccess && membership ? (
                          <ProjectActionsMenu
                            onArchived={() => void projectsQuery.refetch()}
                            projectItem={projectItem}
                          />
                        ) : pendingAccessRequest ? (
                          <StatusBadge tone="warning">Request pending</StatusBadge>
                        ) : latestRequestStatus === 'denied' ? (
                          <Button
                            disabled={createAccessRequest.isPending}
                            onClick={() => void handleRequestAccess(project.id)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Request access again
                          </Button>
                        ) : (
                          <Button
                            disabled={createAccessRequest.isPending}
                            onClick={() => void handleRequestAccess(project.id)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Request access
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create project</CardTitle>
            <CardDescription>
              Create a new project workspace. You will become the project owner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateProjectForm onCreated={() => void projectsQuery.refetch()} />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
