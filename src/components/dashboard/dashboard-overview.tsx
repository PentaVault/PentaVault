'use client'

import Link from 'next/link'

import { FolderOpen, Plus, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PROJECTS_PATH,
  SETTINGS_ORGANIZATION_MEMBERS_PATH,
  getProjectPath,
} from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useProjectsQuery } from '@/lib/hooks/use-projects'
import { useOrganizationMembers } from '@/lib/hooks/use-team'

function formatToday() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
}

function StatCard({
  description,
  href,
  label,
  value,
}: {
  description: string
  href?: string
  label: string
  value: number
}) {
  const content = (
    <Card className={href ? 'transition-colors hover:border-border-strong hover:bg-card-elevated' : undefined}>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-4xl leading-none tracking-tight">{value}</p>
      </CardContent>
    </Card>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

export function DashboardOverview() {
  const auth = useAuth()
  const projectsQuery = useProjectsQuery()
  const activeOrg = auth.activeOrganization?.organization
  const membersQuery = useOrganizationMembers(activeOrg?.id ?? null)
  const projects = projectsQuery.data?.projects ?? []
  const activeProjects = projects.filter(({ project }) => project.status === 'active')
  const archivedProjects = projects.filter(({ project }) => project.status === 'archived')
  const firstName = auth.session?.user.name?.split(' ')[0] || 'there'

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Welcome back, {firstName}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {activeOrg?.name ?? 'Organisation'} - {formatToday()}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          description="Projects in this organisation"
          href={PROJECTS_PATH}
          label="Active projects"
          value={activeProjects.length}
        />
        <StatCard
          description="Projects currently archived"
          label="Archived"
          value={archivedProjects.length}
        />
        <StatCard
          description="Members in this organisation"
          href={SETTINGS_ORGANIZATION_MEMBERS_PATH}
          label="Team members"
          value={membersQuery.data?.members.length ?? 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>Jump into common workspace tasks.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={PROJECTS_PATH}>
              <FolderOpen className="mr-2 h-4 w-4" />
              View projects
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={PROJECTS_PATH}>
              <Plus className="mr-2 h-4 w-4" />
              New project
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={SETTINGS_ORGANIZATION_MEMBERS_PATH}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite member
            </Link>
          </Button>
        </CardContent>
      </Card>

      {activeProjects.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">Recent projects</h2>
            <Link
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              href={PROJECTS_PATH}
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {activeProjects.slice(0, 3).map((item) => (
              <Link
                className="block rounded-lg border border-border px-4 py-3 transition-colors hover:border-border-strong hover:bg-card-elevated"
                href={getProjectPath(item.project.id)}
                key={item.project.id}
              >
                <p className="text-sm font-medium">{item.project.name}</p>
                <p className="mt-0.5 text-xs font-mono text-muted-foreground">
                  /{item.project.slug}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
