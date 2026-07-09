'use client'

import {
  BarChart3,
  ChevronLeft,
  KeyRound,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { DashboardNavLink } from '@/components/layout/dashboard-nav-link'
import {
  getOrgProjectAnalyticsPath,
  getOrgProjectAuditPath,
  getOrgProjectConnectPath,
  getOrgProjectPath,
  getOrgProjectSecretsPath,
  getOrgProjectSecurityPath,
  getOrgProjectSettingsPath,
  getOrgProjectsPath,
  getOrgProjectTeamPath,
  getProjectAnalyticsPath,
  getProjectAuditPath,
  getProjectConnectPath,
  getProjectPath,
  getProjectSecretsPath,
  getProjectSecurityPath,
  getProjectSettingsPath,
  getProjectTeamPath,
  PROJECTS_PATH,
} from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useProject } from '@/lib/hooks/use-projects'
import { useUiStore } from '@/lib/stores/ui-store'
import { cn } from '@/lib/utils/cn'

type ProjectLayoutProps = {
  children: ReactNode
}

type ProjectNavItem = {
  href: string
  label: string
  icon: ReactNode
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
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed)
  const toggleSidebarCollapsed = useUiStore((state) => state.toggleSidebarCollapsed)

  const baseNavItems: ProjectNavItem[] = orgIdForProjectUrls
    ? [
        {
          href: getOrgProjectPath(orgIdForProjectUrls, projectId),
          label: 'Overview',
          icon: <LayoutDashboard />,
          exact: true,
        },
        {
          href: getOrgProjectSecretsPath(orgIdForProjectUrls, projectId),
          label: 'Secrets',
          icon: <KeyRound />,
        },
        {
          href: getOrgProjectConnectPath(orgIdForProjectUrls, projectId),
          label: 'Connect',
          icon: <Plug />,
        },
        {
          href: getOrgProjectTeamPath(orgIdForProjectUrls, projectId),
          label: 'Team & Access',
          icon: <Users />,
        },
        {
          href: getOrgProjectAuditPath(orgIdForProjectUrls, projectId),
          label: 'Audit log',
          icon: <ScrollText />,
        },
        {
          href: getOrgProjectSecurityPath(orgIdForProjectUrls, projectId),
          label: 'Security',
          icon: <ShieldCheck />,
        },
        {
          href: getOrgProjectAnalyticsPath(orgIdForProjectUrls, projectId),
          label: 'Analytics',
          icon: <BarChart3 />,
        },
      ]
    : [
        {
          href: getProjectPath(projectId),
          label: 'Overview',
          icon: <LayoutDashboard />,
          exact: true,
        },
        { href: getProjectSecretsPath(projectId), label: 'Secrets', icon: <KeyRound /> },
        { href: getProjectConnectPath(projectId), label: 'Connect', icon: <Plug /> },
        { href: getProjectTeamPath(projectId), label: 'Team & Access', icon: <Users /> },
        { href: getProjectAuditPath(projectId), label: 'Audit log', icon: <ScrollText /> },
        { href: getProjectSecurityPath(projectId), label: 'Security', icon: <ShieldCheck /> },
        { href: getProjectAnalyticsPath(projectId), label: 'Analytics', icon: <BarChart3 /> },
      ]
  const navItems = canUseRestrictedProjectPages
    ? baseNavItems
    : baseNavItems.filter(
        (item) =>
          item.label !== 'Audit log' && item.label !== 'Security' && item.label !== 'Analytics'
      )
  const allProjectsHref = orgIdForProjectUrls
    ? getOrgProjectsPath(orgIdForProjectUrls)
    : PROJECTS_PATH
  const settingsHref = orgIdForProjectUrls
    ? getOrgProjectSettingsPath(orgIdForProjectUrls, projectId)
    : getProjectSettingsPath(projectId)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden md:flex-row">
      <aside
        className={cn(
          'flex h-full w-full flex-shrink-0 flex-col overflow-y-auto border-b border-border bg-card transition-[width] duration-200 ease-out motion-reduce:transition-none md:border-r md:border-b-0',
          sidebarCollapsed ? 'md:w-16' : 'md:w-56'
        )}
      >
        <div className="border-b border-border p-3">
          <Link
            className={cn(
              'flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground',
              sidebarCollapsed && 'md:justify-center'
            )}
            href={allProjectsHref}
            title={sidebarCollapsed ? 'All projects' : undefined}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {sidebarCollapsed ? <span className="md:hidden">All projects</span> : 'All projects'}
          </Link>
        </div>

        {sidebarCollapsed ? null : (
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
        )}

        <nav className="flex flex-1 flex-col gap-1 p-2">
          {navItems.map((item) => (
            <DashboardNavLink
              collapsed={sidebarCollapsed}
              exact={item.exact ?? false}
              href={item.href}
              icon={item.icon}
              key={item.href}
              label={item.label}
            />
          ))}
        </nav>

        <div className="w-full border-t border-border p-2 md:mt-auto">
          {sidebarCollapsed ? null : (
            <p className="px-3 py-1 font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
              Project
            </p>
          )}
          <DashboardNavLink
            className="w-full"
            collapsed={sidebarCollapsed}
            href={settingsHref}
            icon={<Settings />}
            label="Settings"
          />
          <button
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'mt-1 hidden w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-card-elevated hover:text-foreground md:flex',
              sidebarCollapsed ? 'justify-center px-2' : 'justify-start'
            )}
            onClick={toggleSidebarCollapsed}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center text-current">
              {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </span>
            {sidebarCollapsed ? null : 'Collapse'}
          </button>
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
