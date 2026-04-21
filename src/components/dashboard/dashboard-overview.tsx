'use client'

import Link from 'next/link'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { StatusBadge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PROJECTS_PATH, getOrgProjectsPath } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useProjectsQuery } from '@/lib/hooks/use-projects'

function getAuthTone(status: 'loading' | 'authenticated' | 'unauthenticated') {
  if (status === 'authenticated') {
    return 'success'
  }

  if (status === 'loading') {
    return 'warning'
  }

  return 'danger'
}

export function DashboardOverview() {
  const auth = useAuth()
  const projectsQuery = useProjectsQuery()
  const activeOrgId = auth.activeOrganization?.organization.id ?? null

  const projectCount = projectsQuery.data?.projects.length ?? 0
  const archivedCount = projectsQuery.data?.projects.filter(
    ({ project }) => project.status === 'archived'
  ).length

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="space-y-2">
          <StatusBadge tone="neutral">Security Console</StatusBadge>
          <h1 className="text-4xl leading-[1.08] tracking-tight">Dashboard overview</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Session-aware project security console. Authentication UI remains deferred, but this
            shell is Better Auth ready.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total projects</CardTitle>
              <CardDescription>Workspaces available to your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl leading-none tracking-tight">{projectCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Archived projects</CardTitle>
              <CardDescription>Projects currently in archived state.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl leading-none tracking-tight">{archivedCount ?? 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session status</CardTitle>
              <CardDescription>Derived from `/api/v1/auth/session`.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <StatusBadge tone={getAuthTone(auth.status)} className="capitalize">
                  {auth.status}
                </StatusBadge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Next actions</CardTitle>
            <CardDescription>
              Continue with project, secret, token, and audit workflows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={activeOrgId ? getOrgProjectsPath(activeOrgId) : PROJECTS_PATH}
              className="inline-flex h-9 items-center rounded-md border border-accent/35 px-8 py-2 text-sm font-medium text-accent transition-colors hover:border-accent/50 hover:text-accent-strong"
            >
              Open projects
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
