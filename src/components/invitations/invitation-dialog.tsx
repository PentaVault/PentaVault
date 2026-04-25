'use client'

import type { ReactNode } from 'react'

import { Building2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/lib/hooks/use-auth'
import {
  useAcceptInvitation,
  useAcceptInvitationById,
  useRejectInvitation,
  useRejectInvitationById,
} from '@/lib/hooks/use-invitations'
import { useToast } from '@/lib/hooks/use-toast'
import type { VerifyInvitationResponse } from '@/lib/types/api'
import { getApiErrorCode, getApiFriendlyMessage } from '@/lib/utils/errors'

type InvitationDialogProps = {
  invite: VerifyInvitationResponse
  token?: string
  invitationId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccepted?: () => void
  onRejected?: () => void
  onUnavailable?: (reason: 'alreadyUsed' | 'expired') => void
}

function Field({ children }: { children: ReactNode }) {
  return <span className="block text-sm text-muted-foreground">{children}</span>
}

export function InvitationDialog({
  invite,
  invitationId,
  token,
  open,
  onAccepted,
  onOpenChange,
  onRejected,
  onUnavailable,
}: InvitationDialogProps) {
  const acceptInvitation = useAcceptInvitation()
  const acceptInvitationById = useAcceptInvitationById()
  const rejectInvitation = useRejectInvitation()
  const rejectInvitationById = useRejectInvitationById()
  const auth = useAuth()
  const { toast } = useToast()
  const isMutating =
    acceptInvitation.isPending ||
    acceptInvitationById.isPending ||
    rejectInvitation.isPending ||
    rejectInvitationById.isPending

  async function accept() {
    try {
      const result = token
        ? await acceptInvitation.mutateAsync(token)
        : invitationId
          ? await acceptInvitationById.mutateAsync(invitationId)
          : null

      if (!result) {
        throw new Error('Invitation action is missing an identifier.')
      }

      try {
        await auth.setActiveOrganization({ organizationId: result.invitation.organizationId })
      } catch {
        await auth.refresh()
      }
      toast.success('Invitation accepted.')
      onAccepted?.()
      onOpenChange(false)
    } catch (error) {
      const code = getApiErrorCode(error)
      if (code === 'INVITATION_EXPIRED') {
        onUnavailable?.('expired')
        onOpenChange(false)
      } else if (code === 'INVITATION_ALREADY_USED') {
        onUnavailable?.('alreadyUsed')
        onOpenChange(false)
      }
      toast.error(getApiFriendlyMessage(error, 'Unable to accept this invitation.'))
    }
  }

  async function reject() {
    try {
      if (token) {
        await rejectInvitation.mutateAsync(token)
      } else if (invitationId) {
        await rejectInvitationById.mutateAsync(invitationId)
      } else {
        throw new Error('Invitation action is missing an identifier.')
      }
      toast.success('Invitation declined.')
      onRejected?.()
      onOpenChange(false)
    } catch (error) {
      const code = getApiErrorCode(error)
      if (code === 'INVITATION_EXPIRED') {
        onUnavailable?.('expired')
        onOpenChange(false)
      } else if (code === 'INVITATION_ALREADY_USED') {
        onUnavailable?.('alreadyUsed')
        onOpenChange(false)
      }
      toast.error(getApiFriendlyMessage(error, 'Unable to decline this invitation.'))
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/45" />
        <DialogContent className="fixed top-1/2 left-1/2 z-50 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-xl">
          <DialogClose className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border hover:text-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close invitation dialog</span>
          </DialogClose>
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
              <Building2 className="h-7 w-7 text-accent" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Join {invite.organizationName ?? 'this organisation'}?
              </DialogTitle>
              <DialogDescription className="mt-3 space-y-1.5">
                <Field>
                  {invite.invitedByName ?? 'A teammate'} invited you as a{' '}
                  <span className="font-medium text-foreground">{invite.role ?? 'member'}</span>.
                </Field>
                {invite.organizationName ? (
                  <Field>Organisation: {invite.organizationName}</Field>
                ) : null}
                {invite.email ? <Field>Sent to {invite.email}</Field> : null}
                {invite.expiresAt ? (
                  <Field>Expires {new Date(invite.expiresAt).toLocaleString()}</Field>
                ) : null}
              </DialogDescription>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button
              disabled={isMutating}
              onClick={() => void reject()}
              type="button"
              variant="outline"
            >
              {rejectInvitation.isPending || rejectInvitationById.isPending
                ? 'Declining...'
                : 'Decline'}
            </Button>
            <Button disabled={isMutating} onClick={() => void accept()} type="button">
              {acceptInvitation.isPending || acceptInvitationById.isPending
                ? 'Joining...'
                : 'Accept invite'}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
