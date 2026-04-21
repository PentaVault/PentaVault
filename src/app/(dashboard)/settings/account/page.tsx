'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { PageWrapper } from '@/components/layout/page-wrapper'
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
  const [name, setName] = useState(auth.session?.user.name ?? '')
  const [emailInput, setEmailInput] = useState('')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const user = auth.session?.user

  async function handleDeleteAccount(): Promise<void> {
    if (!user?.email || emailInput !== user.email) {
      return
    }

    setIsDeleting(true)

    try {
      await authApi.deleteAccount({ email: user.email })
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

  return (
    <PageWrapper>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your personal account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="account-name">
                Full name
              </label>
              <Input
                id="account-name"
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="account-email">
                Email
              </label>
              <Input disabled id="account-email" value={user?.email ?? ''} />
              <p className="text-xs text-muted-foreground">Email changes are not yet supported.</p>
            </div>
          </CardContent>
        </Card>

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

      <Dialog onOpenChange={setIsDeleteDialogOpen} open={isDeleteDialogOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/45" />
          <DialogContent
            aria-describedby="delete-account-description"
            className="fixed top-1/2 left-1/2 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5"
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
            <div className="mt-4 space-y-2">
              <p className="text-sm">Type your email address to confirm:</p>
              <Input
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder={user?.email ?? ''}
                type="email"
                value={emailInput}
              />
            </div>
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
                disabled={emailInput !== user?.email || isDeleting}
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
    </PageWrapper>
  )
}
