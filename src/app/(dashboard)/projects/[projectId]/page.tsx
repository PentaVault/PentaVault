'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { StatusBadge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getOrgProjectAuditPath,
  getOrgProjectSecretsPath,
  getOrgProjectSecurityPath,
  getOrgProjectTokensPath,
  getOrgProjectUsagePath,
  getProjectAuditPath,
  getProjectSecretsPath,
  getProjectSecurityPath,
  getProjectTokensPath,
  getProjectUsagePath,
} from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useProject } from '@/lib/hooks/use-projects'
import { formatDateTime } from '@/lib/utils/format'

function membershipTone(role: 'owner' | 'admin' | 'member' | 'developer' | 'readonly') {
  return role === 'owner' ? 'warning' : role === 'admin' ? 'success' : 'neutral'
}

function projectStatusTone(status: 'active' | 'archived') {
  return status === 'active' ? 'success' : 'warning'
}

export default function ProjectOverviewPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null
  const projectQuery = useProject(projectId)
  const auth = useAuth()

  if (projectQuery.isLoading) {
    return (
      <PageWrapper>
        <Card>
          <CardHeader>
            <CardTitle>Project overview</CardTitle>
            <CardDescription>Loading project details...</CardDescription>
          </CardHeader>
        </Card>
      </PageWrapper>
    )
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <PageWrapper>
        <Card>
          <CardHeader>
            <CardTitle>Project unavailable</CardTitle>
            <CardDescription>
              The project could not be loaded. It may not exist or your account may not have access.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageWrapper>
    )
  }

  const { project, membership } = projectQuery.data
  const activeOrgId = auth.activeOrganization?.organization.id ?? null
  const links = [
    {
      href: activeOrgId
        ? getOrgProjectSecretsPath(activeOrgId, project.id)
        : getProjectSecretsPath(project.id),
      label: 'Manage secrets',
    },
    {
      href: activeOrgId
        ? getOrgProjectTokensPath(activeOrgId, project.id)
        : getProjectTokensPath(project.id),
      label: 'Manage tokens',
    },
    {
      href: activeOrgId
        ? getOrgProjectAuditPath(activeOrgId, project.id)
        : getProjectAuditPath(project.id),
      label: 'Review audit log',
    },
    {
      href: activeOrgId
        ? getOrgProjectSecurityPath(activeOrgId, project.id)
        : getProjectSecurityPath(project.id),
      label: 'Security alerts and recommendations',
    },
    {
      href: activeOrgId
        ? getOrgProjectUsagePath(activeOrgId, project.id)
        : getProjectUsagePath(project.id),
      label: 'View usage status',
    },
  ]

  return (
    <PageWrapper>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>{project.name}</CardTitle>
            <CardDescription>/{project.slug}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="mb-2 flex flex-wrap gap-2">
              {membership ? (
                <StatusBadge tone={membershipTone(membership.role)}>
                  role: {membership.role}
                </StatusBadge>
              ) : null}
              <StatusBadge tone={projectStatusTone(project.status)}>{project.status}</StatusBadge>
            </div>
            <p>Project ID: {project.id}</p>
            <p>Created: {formatDateTime(project.createdAt)}</p>
            <p>Updated: {formatDateTime(project.updatedAt)}</p>
            <p>
              Archived at:{' '}
              {project.archivedAt ? formatDateTime(project.archivedAt) : 'Not archived'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project actions</CardTitle>
            <CardDescription>Jump to project management sections.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-border-strong hover:bg-card-elevated"
              >
                {link.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
