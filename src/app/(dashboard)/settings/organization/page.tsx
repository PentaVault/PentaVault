'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { InlineEditField } from '@/components/settings/inline-edit-field'
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
import { DASHBOARD_HOME_PATH } from '@/lib/constants'
import { env } from '@/lib/env'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

export default function OrganizationSettingsPage() {
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const activeOrg = auth.activeOrganization
  const organization = activeOrg?.organization
  const [confirmSlug, setConfirmSlug] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSavingOrg, setIsSavingOrg] = useState(false)
  const [isDeletingOrg, setIsDeletingOrg] = useState(false)

  if (!organization) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Organisation</CardTitle>
            <CardDescription>Loading organisation settings...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const defaultOrganizationId = auth.session?.user.defaultOrganizationId ?? null
  const isOwner = activeOrg?.membership.role === 'owner'
  const canDeleteOrg = defaultOrganizationId
    ? isOwner && organization.id !== defaultOrganizationId
    : isOwner && !organization.isDefault
  const orgUrl = `${env.appUrl}/org/${organization.slug}`

  async function handleSaveOrganization(name: string): Promise<void> {
    if (!organization || !isOwner) {
      toast.error('Only organisation owners can update organisation settings.')
      return
    }

    setIsSavingOrg(true)

    try {
      await organizationsApi.update({
        organizationId: organization.id,
        data: { name },
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
    if (!organization || confirmSlug.trim() !== organization.slug) {
      return
    }

    setIsDeletingOrg(true)
    setDeleteError(null)

    try {
      await organizationsApi.delete({ organizationId: organization.id })
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
    <TooltipProvider>
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Organisation</CardTitle>
            <CardDescription>Manage the current organisation workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <InlineEditField
                disabled={!isOwner}
                disabledReason="Only organisation owners can update organisation settings."
                isPending={isSavingOrg}
                key={organization.name}
                label="Organisation name"
                onSave={(name) => void handleSaveOrganization(name)}
                value={organization.name}
              />
              <p className="text-xs text-muted-foreground">
                The organisation URL is generated automatically and cannot be edited.
              </p>
            </div>

            <div className="rounded-lg border border-border">
              <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Organisation ID</p>
                  <p className="truncate text-xs font-mono text-muted-foreground">
                    {organization.id}
                  </p>
                </div>
                <CopyButton label="Copy organisation ID" value={organization.id} />
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Organisation URL</p>
                  <p className="truncate text-xs font-mono text-muted-foreground">{orgUrl}</p>
                </div>
                <CopyButton label="Copy organisation URL" value={orgUrl} />
              </div>
            </div>

            <div className="rounded-lg border border-danger/40 bg-danger/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-medium text-danger">Danger zone</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Permanently delete this organisation and all associated data.
                  </p>
                  {deleteError ? <p className="mt-2 text-sm text-danger">{deleteError}</p> : null}
                </div>
                {canDeleteOrg ? (
                  <Button
                    aria-label={`Delete ${organization.name} organisation permanently`}
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
                      <p>
                        {isOwner
                          ? 'Your personal organisation cannot be deleted.'
                          : 'Only organisation owners can delete organisations.'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open)
            if (!open) {
              setConfirmSlug('')
              setDeleteError(null)
            }
          }}
          open={isDeleteDialogOpen}
        >
          <DialogPortal>
            <DialogOverlay className="fixed inset-0 bg-black/45" />
            <DialogContent
              aria-describedby="delete-org-description"
              className="fixed top-1/2 left-1/2 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-xl border border-border bg-card p-5"
            >
              <DialogTitle className="text-danger">
                Delete &quot;{organization.name}&quot;?
              </DialogTitle>
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
              <div className="mt-4 space-y-2 pt-1">
                <p className="text-sm text-muted-foreground">
                  To confirm, type the organisation identifier below:
                </p>
                <code className="block rounded-md bg-card-elevated px-2 py-1 text-xs font-mono text-foreground">
                  {organization.slug}
                </code>
                <Input
                  className="font-mono text-sm"
                  onChange={(event) => setConfirmSlug(event.target.value)}
                  placeholder={organization.slug}
                  value={confirmSlug}
                />
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
                  aria-label={`Delete ${organization.name} organisation permanently`}
                  disabled={confirmSlug.trim() !== organization.slug || isDeletingOrg}
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
      </div>
    </TooltipProvider>
  )
}
