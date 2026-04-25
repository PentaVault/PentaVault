'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'

import { formatDistanceToNow } from 'date-fns'
import { Building2, Mail, XCircle } from 'lucide-react'

import { InvitationDialog } from '@/components/invitations/invitation-dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/use-auth'
import { useVerifyInvitation } from '@/lib/hooks/use-invitations'
import type { VerifyInvitationResponse } from '@/lib/types/api'

function formatExpiry(value: string | null) {
  return value ? `in ${formatDistanceToNow(new Date(value))}` : 'soon'
}

function InvitationError({ message }: { message: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md space-y-4 rounded-lg border border-border bg-card p-6 text-center">
      <XCircle className="mx-auto h-10 w-10 text-danger" />
      <h1 className="text-lg font-semibold">Invitation unavailable</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function InvitationSummary({ invite }: { invite: VerifyInvitationResponse }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
        <Building2 className="h-6 w-6 text-accent" />
      </div>
      <h1 className="mt-3 text-xl font-semibold">Join {invite.organizationName}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {invite.invitedByName ?? 'A teammate'} invited you as a{' '}
        <span className="font-medium text-foreground">{invite.role}</span>.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Invitation sent to <span className="font-medium text-foreground">{invite.email}</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Expires {formatExpiry(invite.expiresAt)}</p>
    </div>
  )
}

function invitationUnavailableMessage(invite: VerifyInvitationResponse | null | undefined): string {
  if (!invite || (!invite.valid && !invite.expired && !invite.alreadyUsed)) {
    return 'This invitation link is invalid.'
  }

  if (invite.expired) {
    return `This invitation expired. Contact ${
      invite.invitedByName ?? 'the sender'
    } to request a new one.`
  }

  if (invite.status === 'accepted') {
    return 'This invitation has already been accepted.'
  }

  if (invite.status === 'rejected') {
    return 'This invitation has already been declined.'
  }

  if (invite.alreadyUsed) {
    return 'This invitation has already been used.'
  }

  return 'This invitation is unavailable.'
}

export default function InvitationPage() {
  const router = useRouter()
  const params = useParams<{ token?: string | string[] }>()
  const token = Array.isArray(params.token) ? params.token[0] : (params.token ?? '')
  const [dialogOpen, setDialogOpen] = useState(true)
  const auth = useAuth()
  const { data: invite, isLoading, isError } = useVerifyInvitation(token)

  if (isLoading) {
    return <div className="mx-auto mt-16 h-52 max-w-md animate-pulse rounded-lg bg-card" />
  }

  if (isError || !invite || !invite.valid) {
    return <InvitationError message={invitationUnavailableMessage(invite)} />
  }

  const currentEmail = auth.session?.user.email
  if (!currentEmail) {
    return (
      <div className="mx-auto mt-16 max-w-md space-y-4 rounded-lg border border-border bg-card p-6">
        <InvitationSummary invite={invite} />
        <div className="space-y-2 pt-2">
          <Button asChild className="w-full">
            <Link
              href={`/login?invitation=${token}&email=${encodeURIComponent(invite.email ?? '')}`}
            >
              Sign in to accept
            </Link>
          </Button>
          <Button asChild className="w-full" variant="outline">
            <Link
              href={`/register?invitation=${token}&email=${encodeURIComponent(invite.email ?? '')}`}
            >
              Create account to accept
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (invite.email && currentEmail.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <div className="mx-auto mt-16 max-w-md space-y-4 rounded-lg border border-border bg-card p-6 text-center">
        <Mail className="mx-auto h-10 w-10 text-warning" />
        <h1 className="text-lg font-semibold">Use the invited email</h1>
        <p className="text-sm text-muted-foreground">
          This invite is for {invite.email}, but you are signed in as {currentEmail}.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-16 max-w-md space-y-5 rounded-lg border border-border bg-card p-6">
      <InvitationSummary invite={invite} />
      <Button className="w-full" onClick={() => setDialogOpen(true)} type="button">
        Open invitation
      </Button>
      <InvitationDialog
        invite={invite}
        onAccepted={() => {
          void auth.refresh().then(() => router.replace('/dashboard'))
        }}
        onOpenChange={setDialogOpen}
        onRejected={() => router.replace('/login')}
        open={dialogOpen}
        token={token}
      />
    </div>
  )
}
