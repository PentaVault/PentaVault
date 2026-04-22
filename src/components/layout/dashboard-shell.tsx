'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { BarChart3, FolderKanban, LayoutDashboard, Settings } from 'lucide-react'

import { DashboardNavLink } from '@/components/layout/dashboard-nav-link'
import { OrgSwitcher } from '@/components/layout/org-switcher'
import { ProfileMenu } from '@/components/layout/profile-menu'
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
import { authApi } from '@/lib/api/auth'
import {
  APP_NAME,
  DASHBOARD_HOME_PATH,
  getOrgDashboardPath,
  getOrgOnboardingPath,
  getOrgProjectsPath,
  getOrgSettingsPath,
} from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type DashboardShellProps = {
  children: ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const auth = useAuth()
  const pathname = usePathname()
  const { toast } = useToast()
  const activeOrganization = auth.activeOrganization?.organization
  const isProjectRoute = /\/projects\/[^/]+/.test(pathname)
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false)
  const [organizationName, setOrganizationName] = useState('')
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false)

  function slugifyOrganizationName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  async function handleCreateOrganization(): Promise<void> {
    const normalizedName = organizationName.trim()

    if (!normalizedName) {
      toast.error('Organization name is required.')
      return
    }

    setIsCreatingOrganization(true)

    try {
      await authApi.createOrganization({
        name: normalizedName,
        keepCurrentActiveOrganization: false,
      })
      await auth.refresh()
      setOrganizationName('')
      setIsCreateOrgOpen(false)
      toast.success('Organization created successfully.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to create organization right now.'))
    } finally {
      setIsCreatingOrganization(false)
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="z-20 flex-shrink-0 border-b border-border bg-[var(--header-glass)] backdrop-blur">
        <div className="flex w-full flex-col gap-3 px-2 py-3 sm:px-3 lg:px-4">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Link
                className="text-sm font-mono tracking-[0.12em] uppercase"
                href={DASHBOARD_HOME_PATH}
              >
                <span className="text-[#00c573]">{APP_NAME}</span> Console
              </Link>

              {auth.status === 'loading' ? (
                <div className="h-8 w-[240px] animate-pulse rounded-md border border-border bg-card" />
              ) : auth.status === 'authenticated' ? (
                <OrgSwitcher onCreateOrganization={() => setIsCreateOrgOpen(true)} />
              ) : null}
            </div>
            {auth.status === 'authenticated' ? <ProfileMenu /> : null}
          </div>
        </div>
      </header>

      <Dialog onOpenChange={setIsCreateOrgOpen} open={isCreateOrgOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/45" />
          <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5">
            <DialogTitle className="text-xl">Create organization</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Add a new workspace for a team, client, or environment boundary.
            </DialogDescription>

            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <label
                  className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                  htmlFor="organization-name"
                >
                  Organization name
                </label>
                <Input
                  id="organization-name"
                  onChange={(event) => setOrganizationName(event.target.value)}
                  placeholder="Acme Platform"
                  value={organizationName}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                URL preview: /{slugifyOrganizationName(organizationName) || 'your-organization'}
                -xxxxxxxx
              </p>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setIsCreateOrgOpen(false)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isCreatingOrganization}
                  onClick={() => void handleCreateOrganization()}
                  size="sm"
                  type="button"
                >
                  {isCreatingOrganization ? 'Creating...' : 'Create organization'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <div
        className={cn(
          'grid min-h-0 flex-1 w-full grid-cols-1 gap-0 overflow-hidden',
          isProjectRoute ? 'md:grid-cols-1' : 'md:grid-cols-[220px_1fr]'
        )}
      >
        {!isProjectRoute ? (
          <aside className="flex h-full flex-col overflow-y-auto border-b border-border bg-card md:border-r md:border-b-0">
            <nav className="flex flex-1 flex-wrap gap-2 px-2 py-3 md:flex-col md:px-3 md:py-4">
              <DashboardNavLink
                exact
                href={
                  activeOrganization
                    ? getOrgDashboardPath(activeOrganization.id)
                    : DASHBOARD_HOME_PATH
                }
                icon={<LayoutDashboard />}
                label="Overview"
              />
              <DashboardNavLink
                href={
                  activeOrganization
                    ? getOrgProjectsPath(activeOrganization.id)
                    : DASHBOARD_HOME_PATH
                }
                icon={<FolderKanban />}
                label="Projects"
              />
              <DashboardNavLink
                href={
                  activeOrganization
                    ? getOrgOnboardingPath(activeOrganization.id)
                    : DASHBOARD_HOME_PATH
                }
                icon={<BarChart3 />}
                label="Onboarding"
              />
            </nav>

            <div className="border-t border-border p-2">
              <DashboardNavLink
                href={
                  activeOrganization
                    ? getOrgSettingsPath(activeOrganization.id)
                    : DASHBOARD_HOME_PATH
                }
                icon={<Settings />}
                label="Settings"
              />
            </div>
          </aside>
        ) : null}

        <main className="min-h-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
