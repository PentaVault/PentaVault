'use client'

import Link from 'next/link'

import { CreateProjectForm } from '@/components/dashboard/create-project-form'
import { ProjectActionsMenu } from '@/components/dashboard/project-actions-menu'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { StatusBadge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getProjectPath } from '@/lib/constants'
import { useProjectsQuery } from '@/lib/hooks/use-projects'
import { formatDateTime } from '@/lib/utils/format'

function projectStatusTone(status: 'active' | 'archived') {
  return status === 'active' ? 'success' : 'warning'
}

export default function ProjectsPage() {
  const projectsQuery = useProjectsQuery()

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
                {projects.map(({ project, membership }) => (
                  <div
                    className="rounded-xl border border-border p-4 transition-colors hover:border-border-strong hover:bg-card-elevated"
                    key={project.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          className="text-lg tracking-[-0.16px] text-foreground hover:text-[#3ecf8e]"
                          href={getProjectPath(project.id)}
                        >
                          {project.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">/{project.slug}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <StatusBadge tone="neutral">{membership.role}</StatusBadge>
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
                      <ProjectActionsMenu
                        onArchived={() => void projectsQuery.refetch()}
                        projectItem={{ project, membership }}
                      />
                    </div>
                  </div>
                ))}
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
