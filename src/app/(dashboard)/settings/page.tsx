'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { CopyButton } from '@/components/shared/copy-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { organizationsApi } from '@/lib/api/organizations'
import {
  DASHBOARD_HOME_PATH,
  SETTINGS_ACCOUNT_PATH,
  SETTINGS_API_KEYS_PATH,
  SETTINGS_BILLING_PATH,
  SETTINGS_SESSIONS_PATH,
  getOrgSettingsApiKeysPath,
  getOrgSettingsBillingPath,
  getOrgSettingsSessionsPath,
} from '@/lib/constants'
import { env } from '@/lib/env'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type OrganizationSettingsCardProps = {
  activeOrg: NonNullable<ReturnType<typeof useAuth>['activeOrganization']>
}

function OrganizationSettingsCard({ activeOrg }: OrganizationSettingsCardProps) {
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [organizationName, setOrganizationName] = useState(activeOrg.organization.name)
  const [confirmName, setConfirmName] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSavingOrg, setIsSavingOrg] = useState(false)
  const [isDeletingOrg, setIsDeletingOrg] = useState(false)

  const currentName = activeOrg.organization.name
  const hasChanges = organizationName.trim() !== currentName
  const isValid = organizationName.trim().length >= 2 && organizationName.trim().length <= 50
  const defaultOrganizationId = auth.session?.user.defaultOrganizationId ?? null
  const canDeleteOrg = defaultOrganizationId
    ? activeOrg.organization.id !== defaultOrganizationId
    : !activeOrg.organization.isDefault
  const orgUrl = `${env.appUrl}/org/${activeOrg.organization.slug}`

  async function handleSaveOrganization(): Promise<void> {
    if (!hasChanges || !isValid) {
      return
    }

    setIsSavingOrg(true)

    try {
      await organizationsApi.update({
        organizationId: activeOrg.organization.id,
        data: {
          name: organizationName.trim(),
        },
      })
      await auth.refresh()
      toast.success('Organisation updated successfully.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update organisation right now.'))
    } finally {
      setIsSavingOrg(false)
    }
  }

  async function handleDeleteOrganization(): Promise<void> {
    if (confirmName.trim() !== currentName) {
      return
    }

    setIsDeletingOrg(true)
    setDeleteError(null)

    try {
      await organizationsApi.delete({ organizationId: activeOrg.organization.id })
      await auth.refresh()
      setIsDeleteDialogOpen(false)
      toast.success('Organisation deleted successfully.')
      router.replace(DASHBOARD_HOME_PATH)
    } catch (error) {
      const message = getApiFriendlyMessage(error, 'Unable to delete organisation right now.')
      setDeleteError(message)
      toast.error(message)
    } finally {
      setIsDeletingOrg(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Organisation</CardTitle>
          <CardDescription>Manage the current organisation workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label
              className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor="settings-organization-name"
            >
              Organisation name
            </label>
            <Input
              id="settings-organization-name"
              onChange={(event) => setOrganizationName(event.target.value)}
              value={organizationName}
            />
            <p className="text-xs text-muted-foreground">
              The organisation URL is generated automatically and cannot be edited.
            </p>
            {hasChanges ? (
              <div className="flex justify-end">
                <Button
                  disabled={!isValid || isSavingOrg}
                  onClick={() => void handleSaveOrganization()}
                  size="sm"
                  type="button"
                >
                  {isSavingOrg ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Organisation ID</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {activeOrg.organization.id}
                </p>
              </div>
              <CopyButton label="Copy organisation ID" value={activeOrg.organization.id} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Organisation URL</p>
                <p className="truncate text-xs font-mono text-muted-foreground">{orgUrl}</p>
              </div>
              <CopyButton label="Copy organisation URL" value={orgUrl} />
            </div>
          </div>

          <div className="border-t border-danger/40 pt-6">
            <div className="rounded-lg border border-danger/40 bg-danger/5 p-4">
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-danger">Danger zone</h2>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this organisation and all associated data.
                </p>
                {deleteError ? <p className="text-sm text-danger">{deleteError}</p> : null}
                <div className="flex justify-end">
                  {canDeleteOrg ? (
                    <Button
                      aria-label={`Delete ${currentName} organisation permanently`}
                      onClick={() => setIsDeleteDialogOpen(true)}
                      size="sm"
                      type="button"
                      variant="danger"
                    >
                      Delete organisation
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button disabled size="sm" type="button" variant="danger">
                            Delete organisation
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Your personal organisation cannot be deleted.</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog onOpenChange={setIsDeleteDialogOpen} open={isDeleteDialogOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/45" />
          <DialogContent
            aria-describedby="delete-org-description"
            className="fixed top-1/2 left-1/2 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5"
          >
            <DialogTitle className="text-danger">Delete &quot;{currentName}&quot;?</DialogTitle>
            <DialogDescription
              className="mt-2 text-sm text-muted-foreground"
              id="delete-org-description"
            >
              This will permanently delete the organisation and all its data including:
            </DialogDescription>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>All projects and their secrets</li>
              <li>All proxy tokens</li>
              <li>All audit logs</li>
              <li>All team memberships</li>
            </ul>
            <div className="mt-4 space-y-2">
              <p className="text-sm">To confirm, type the organisation name below:</p>
              <Input onChange={(event) => setConfirmName(event.target.value)} value={confirmName} />
            </div>
            {deleteError ? <p className="mt-3 text-sm text-danger">{deleteError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                onClick={() => setIsDeleteDialogOpen(false)}
                size="sm"
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                aria-label={`Delete ${currentName} organisation permanently`}
                disabled={confirmName.trim() !== currentName || isDeletingOrg}
                onClick={() => void handleDeleteOrganization()}
                size="sm"
                type="button"
                variant="danger"
              >
                {isDeletingOrg ? 'Deleting...' : 'Delete permanently'}
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  )
}

export default function SettingsPage() {
  const auth = useAuth()
  const activeOrg = auth.activeOrganization
  const activeOrgId = activeOrg?.organization.id ?? null

  const settingsLinks = useMemo(
    () => [
      {
        href: activeOrgId ? getOrgSettingsApiKeysPath(activeOrgId) : SETTINGS_API_KEYS_PATH,
        label: 'API key management',
      },
      {
        href: activeOrgId ? getOrgSettingsBillingPath(activeOrgId) : SETTINGS_BILLING_PATH,
        label: 'Billing',
      },
      {
        href: activeOrgId ? getOrgSettingsSessionsPath(activeOrgId) : SETTINGS_SESSIONS_PATH,
        label: 'Session management',
      },
      {
        href: SETTINGS_ACCOUNT_PATH,
        label: 'Account',
      },
    ],
    [activeOrgId]
  )

  return (
    <TooltipProvider>
      <PageWrapper>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Manage organisation configuration, account access, and fallback auth controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {settingsLinks.map((link) => (
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

          {activeOrg && activeOrg.membership.role === 'owner' ? (
            <OrganizationSettingsCard key={activeOrg.organization.id} activeOrg={activeOrg} />
          ) : null}
        </div>
      </PageWrapper>
    </TooltipProvider>
  )
}
