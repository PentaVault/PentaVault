'use client'

import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { DashboardNavLink } from '@/components/layout/dashboard-nav-link'
import {
  getOrgProjectAuditPath,
  getOrgProjectPath,
  getOrgProjectSecretsPath,
  getOrgProjectSecurityPath,
  getOrgProjectSettingsPath,
  getOrgProjectsPath,
  getOrgProjectTeamPath,
  getOrgProjectUsagePath,
  getProjectAuditPath,
  getProjectPath,
  getProjectSecretsPath,
  getProjectSecurityPath,
  getProjectSettingsPath,
  getProjectTeamPath,
  getProjectUsagePath,
  PROJECTS_PATH,
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
  const pathname = usePathname()
  const projectId = params.projectId
  const auth = useAuth()
  const activeOrgId = params.orgId ?? auth.activeOrganization?.organization.id ?? null
  const orgScopedProjectRoute = Boolean(params.orgId) || pathname.startsWith('/dashboard/org/')
  const orgIdForProjectUrls = orgScopedProjectRoute ? activeOrgId : null
  const projectQuery = useProject(projectId)
  const project = projectQuery.data?.project
  const effectiveRole = projectQuery.data?.effectiveRole ?? projectQuery.data?.orgRole ?? null
  const canUseRestrictedProjectPages = effectiveRole === 'owner' || effectiveRole === 'admin'

  const baseNavItems: ProjectNavItem[] = orgIdForProjectUrls
    ? [
        { href: getOrgProjectPath(orgIdForProjectUrls, projectId), label: 'Overview', exact: true },
        { href: getOrgProjectSecretsPath(orgIdForProjectUrls, projectId), label: 'Secrets' },
        { href: getOrgProjectTeamPath(orgIdForProjectUrls, projectId), label: 'Team & Access' },
        { href: getOrgProjectAuditPath(orgIdForProjectUrls, projectId), label: 'Audit log' },
        { href: getOrgProjectSecurityPath(orgIdForProjectUrls, projectId), label: 'Security' },
        { href: getOrgProjectUsagePath(orgIdForProjectUrls, projectId), label: 'Usage' },
      ]
    : [
        { href: getProjectPath(projectId), label: 'Overview', exact: true },
        { href: getProjectSecretsPath(projectId), label: 'Secrets' },
        { href: getProjectTeamPath(projectId), label: 'Team & Access' },
        { href: getProjectAuditPath(projectId), label: 'Audit log' },
        { href: getProjectSecurityPath(projectId), label: 'Security' },
        { href: getProjectUsagePath(projectId), label: 'Usage' },
      ]
  const navItems = canUseRestrictedProjectPages
    ? baseNavItems
    : baseNavItems.filter((item) => item.label !== 'Audit log' && item.label !== 'Security')
  const allProjectsHref = orgIdForProjectUrls
    ? getOrgProjectsPath(orgIdForProjectUrls)
    : PROJECTS_PATH
  const settingsHref = orgIdForProjectUrls
    ? getOrgProjectSettingsPath(orgIdForProjectUrls, projectId)
    : getProjectSettingsPath(projectId)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden md:flex-row">
      <aside className="flex h-full w-full flex-shrink-0 flex-col overflow-y-auto border-b border-border bg-card md:w-56 md:border-r md:border-b-0">
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

        <nav className="flex flex-1 flex-col gap-1 p-2">
          {navItems.map((item) => (
            <DashboardNavLink
              exact={item.exact ?? false}
              href={item.href}
              key={item.href}
              label={item.label}
            />
          ))}
        </nav>

        <div className="w-full border-t border-border p-2 md:mt-auto">
          <p className="px-3 py-1 font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
            Project
          </p>
          <DashboardNavLink className="w-full" href={settingsHref} label="Settings" />
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
