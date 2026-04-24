'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { InlineEditField } from '@/components/settings/inline-edit-field'
import { MfaSettingsCard } from '@/components/settings/mfa-settings-card'
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
import { authApi } from '@/lib/api/auth'
import { clearClientAuthHint } from '@/lib/auth/token'
import { REGISTER_PATH } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

export default function AccountSettingsPage() {
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [emailInput, setEmailInput] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSavingName, setIsSavingName] = useState(false)

  const user = auth.session?.user

  async function handleSaveName(name: string): Promise<void> {
    setIsSavingName(true)

    try {
      await authApi.updateUserName({ name })
      await auth.refresh()
      toast.success('Account name updated successfully.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update your account name right now.'))
    } finally {
      setIsSavingName(false)
    }
  }

  async function handleDeleteAccount(): Promise<void> {
    if (!user?.email || emailInput !== user.email) {
      return
    }

    setIsDeleting(true)

    try {
      await authApi.deleteAccount({
        email: user.email,
        ...(user.twoFactorEnabled ? { totpCode } : {}),
      })
      clearClientAuthHint()
      auth.clear()
      document.cookie = 'better-auth.session_token=; path=/; max-age=0'
      document.cookie = '__Secure-better-auth.session_token=; path=/; max-age=0'
      toast.success('Your account has been permanently deleted.')
      router.replace(REGISTER_PATH)
    } catch (error) {
      toast.error(
        getApiFriendlyMessage(
          error,
          'Account deletion failed. No data was deleted. Please try again.'
        )
      )
    } finally {
      setIsDeleting(false)
    }
  }

  if (auth.status === 'loading' || !user?.id) {
    return <AccountPageSkeleton />
  }

  return (
    <div className="p-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your personal account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InlineEditField
              isPending={isSavingName}
              key={`name-${user.id}`}
              label="Full name"
              onSave={(name) => void handleSaveName(name)}
              value={user.name ?? ''}
            />
            <InlineEditField
              disabled
              disabledReason="Email changes are not yet supported."
              key={`email-${user.id}`}
              label="Email"
              onSave={() => undefined}
              value={user.email ?? ''}
            />
          </CardContent>
        </Card>

        <div className="rounded-xl transition-shadow" id="account-mfa-settings">
          <MfaSettingsCard onChanged={auth.refresh} user={user} />
        </div>

        <Card className="border-danger/40">
          <CardHeader>
            <CardTitle className="text-danger">Danger zone</CardTitle>
            <CardDescription>
              Deleting your account permanently removes all organisations you own, their projects,
              secrets, tokens, API keys, sessions, and audit history.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end">
            <Button onClick={() => setIsDeleteDialogOpen(true)} type="button" variant="danger">
              Delete account
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) {
            setTotpCode('')
          }
        }}
        open={isDeleteDialogOpen}
      >
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/45" />
          <DialogContent
            aria-describedby="delete-account-description"
            className="fixed top-1/2 left-1/2 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-xl border border-border bg-card p-5"
          >
            <DialogTitle className="text-danger">Delete your account permanently</DialogTitle>
            <DialogDescription
              className="mt-2 text-sm text-muted-foreground"
              id="delete-account-description"
            >
              This will permanently delete your account and all associated data.
            </DialogDescription>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>All organisations you own and their projects, secrets, and tokens</li>
              <li>All your API keys and active sessions</li>
              <li>Your complete audit history</li>
            </ul>
            <div className="mt-4 space-y-2 pt-1">
              <p className="text-sm">Type your email address to confirm:</p>
              <Input
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder={user?.email ?? ''}
                type="email"
                value={emailInput}
              />
            </div>
            {user.twoFactorEnabled ? (
              <div className="mt-4 space-y-2">
                <p className="text-sm">Enter your authenticator code:</p>
                <Input
                  autoComplete="one-time-code"
                  className="h-11 text-center font-mono text-base tracking-[0.4em]"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) =>
                    setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="000000"
                  value={totpCode}
                />
              </div>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                onClick={() => {
                  setIsDeleteDialogOpen(false)
                  setTotpCode('')
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={
                  emailInput !== user?.email ||
                  isDeleting ||
                  (user.twoFactorEnabled && totpCode.length !== 6)
                }
                onClick={() => void handleDeleteAccount()}
                size="sm"
                type="button"
                variant="danger"
              >
                {isDeleting ? 'Deleting account...' : 'Delete account permanently'}
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  )
}

function AccountPageSkeleton() {
  return (
    <div className="p-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-7 w-28 animate-pulse rounded bg-background-secondary" />
            <div className="h-4 w-64 animate-pulse rounded bg-background-secondary" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-12 animate-pulse rounded bg-background-secondary" />
            <div className="h-12 animate-pulse rounded bg-background-secondary" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
