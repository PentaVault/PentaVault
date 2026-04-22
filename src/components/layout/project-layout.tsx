'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { ReactNode } from 'react'

import { ChevronLeft } from 'lucide-react'

import { DashboardNavLink } from '@/components/layout/dashboard-nav-link'
import {
  PROJECTS_PATH,
  getOrgProjectAuditPath,
  getOrgProjectPath,
  getOrgProjectSecretsPath,
  getOrgProjectSecurityPath,
  getOrgProjectSettingsPath,
  getOrgProjectTokensPath,
  getOrgProjectUsagePath,
  getOrgProjectsPath,
  getProjectAuditPath,
  getProjectPath,
  getProjectSecretsPath,
  getProjectSecurityPath,
  getProjectSettingsPath,
  getProjectTokensPath,
  getProjectUsagePath,
} from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useProject } from '@/lib/hooks/use-projects'

type ProjectLayoutProps = {
  children: ReactNode
}

type ProjectNavItem = {
  href: string
  label: string
  exact?: boolean
}

export function ProjectLayout({ children }: ProjectLayoutProps) {
  const params = useParams<{ orgId?: string; projectId: string }>()
  const projectId = params.projectId
  const auth = useAuth()
  const activeOrgId = params.orgId ?? auth.activeOrganization?.organization.id ?? null
  const projectQuery = useProject(projectId)
  const project = projectQuery.data?.project

  const navItems: ProjectNavItem[] = activeOrgId
    ? [
        { href: getOrgProjectPath(activeOrgId, projectId), label: 'Overview', exact: true },
        { href: getOrgProjectSecretsPath(activeOrgId, projectId), label: 'Secrets' },
        { href: getOrgProjectTokensPath(activeOrgId, projectId), label: 'Tokens' },
        { href: getOrgProjectAuditPath(activeOrgId, projectId), label: 'Audit log' },
        { href: getOrgProjectSecurityPath(activeOrgId, projectId), label: 'Security' },
        { href: getOrgProjectUsagePath(activeOrgId, projectId), label: 'Usage' },
      ]
    : [
        { href: getProjectPath(projectId), label: 'Overview', exact: true },
        { href: getProjectSecretsPath(projectId), label: 'Secrets' },
        { href: getProjectTokensPath(projectId), label: 'Tokens' },
        { href: getProjectAuditPath(projectId), label: 'Audit log' },
        { href: getProjectSecurityPath(projectId), label: 'Security' },
        { href: getProjectUsagePath(projectId), label: 'Usage' },
      ]
  const allProjectsHref = activeOrgId ? getOrgProjectsPath(activeOrgId) : PROJECTS_PATH
  const settingsHref = activeOrgId
    ? getOrgProjectSettingsPath(activeOrgId, projectId)
    : getProjectSettingsPath(projectId)

  return (
    <div className="flex min-h-[calc(100vh-57px)]">
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border p-3">
          <Link
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            href={allProjectsHref}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            All projects
          </Link>
        </div>

        <div className="border-b border-border p-3">
          {project ? (
            <>
              <p className="truncate text-sm font-medium">{project.name}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">/{project.slug}</p>
            </>
          ) : (
            <div className="h-8 animate-pulse rounded bg-background-elevated" />
          )}
        </div>

        <nav className="space-y-0.5 p-2">
          {navItems.map((item) => (
            <DashboardNavLink
              exact={item.exact ?? false}
              href={item.href}
              key={item.href}
              label={item.label}
            />
          ))}
        </nav>

        <div className="mt-auto border-t border-border p-2">
          <p className="px-3 py-1 font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
            Project
          </p>
          <DashboardNavLink href={settingsHref} label="Settings" />
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  )
}
