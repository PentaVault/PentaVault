'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Copy } from 'lucide-react'

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
import { PasswordInput } from '@/components/ui/password-input'
import { authApi } from '@/lib/api/auth'
import { clearClientAuthHint } from '@/lib/auth/token'
import { REGISTER_PATH } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiErrorPayload, getApiFieldErrors, getApiFriendlyMessage } from '@/lib/utils/errors'

export default function AccountSettingsPage() {
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [emailInput, setEmailInput] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSavingName, setIsSavingName] = useState(false)
  const [passwordMode, setPasswordMode] = useState<'current' | 'email'>('current')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordTotpCode, setPasswordTotpCode] = useState('')
  const [passwordOtp, setPasswordOtp] = useState('')
  const [passwordOtpSent, setPasswordOtpSent] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isSendingPasswordOtp, setIsSendingPasswordOtp] = useState(false)
  const [isCopyingUserId, setIsCopyingUserId] = useState(false)

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

  async function handleSendPasswordOtp(): Promise<void> {
    if (!user?.email) {
      return
    }

    try {
      setIsSendingPasswordOtp(true)
      setPasswordErrors({})
      await authApi.requestPasswordResetOtp({ email: user.email })
      setPasswordOtpSent(true)
      toast.success('Password code sent. Check your email.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to send a password code right now.'))
    } finally {
      setIsSendingPasswordOtp(false)
    }
  }

  async function handleChangePassword(): Promise<void> {
    if (!user?.email) {
      return
    }

    const nextErrors: Record<string, string> = {}
    if (passwordMode === 'current' && !currentPassword) {
      nextErrors.currentPassword = 'Enter your current password.'
    }
    if (passwordMode === 'email' && passwordOtp.trim().length !== 6) {
      nextErrors.otp = 'Enter the 6-digit email code.'
    }
    if (!newPassword) {
      nextErrors.newPassword = 'Enter a new password.'
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirm your new password.'
    } else if (newPassword && newPassword !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }
    if (passwordMode === 'current' && user.twoFactorEnabled && passwordTotpCode.length !== 6) {
      nextErrors.totpCode = 'Enter your 6-digit authenticator code.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setPasswordErrors(nextErrors)
      return
    }

    try {
      setIsChangingPassword(true)
      setPasswordErrors({})

      if (passwordMode === 'current') {
        await authApi.changePassword({
          currentPassword,
          newPassword,
          ...(user.twoFactorEnabled ? { totpCode: passwordTotpCode } : {}),
        })
      } else {
        await authApi.resetPasswordWithOtp({
          email: user.email,
          otp: passwordOtp,
          password: newPassword,
        })
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordTotpCode('')
      setPasswordOtp('')
      setPasswordOtpSent(false)
      toast.success('Password changed successfully.')
    } catch (error) {
      const fields = getApiFieldErrors(error)
      if (fields && Object.keys(fields).length > 0) {
        setPasswordErrors(fields)
      }

      const payload = getApiErrorPayload(error)
      if (payload?.code === 'AUTH_MFA_CODE_INVALID') {
        setPasswordErrors((current) => ({
          ...current,
          totpCode: 'The authenticator code is invalid.',
        }))
      }

      toast.error(getApiFriendlyMessage(error, 'Unable to change your password right now.'))
    } finally {
      setIsChangingPassword(false)
    }
  }

  async function handleCopyUserId(): Promise<void> {
    if (!user?.id || typeof navigator === 'undefined' || !navigator.clipboard) {
      return
    }

    try {
      setIsCopyingUserId(true)
      await navigator.clipboard.writeText(user.id)
      toast.success('User ID copied.')
    } catch {
      toast.error('Unable to copy the user ID.')
    } finally {
      setIsCopyingUserId(false)
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
            <InlineEditField
              disabled
              disabledReason="Username changes are not yet supported."
              key={`username-${user.id}`}
              label="Username"
              onSave={() => undefined}
              value={user.username ? `@${user.username}` : ''}
            />
            <div className="rounded-lg border border-border bg-background-secondary/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
                    User ID
                  </p>
                  <p className="mt-1 truncate font-mono text-sm text-foreground">{user.id}</p>
                </div>
                <Button
                  aria-label="Copy user ID"
                  className="h-9 w-9 flex-shrink-0 px-0"
                  disabled={isCopyingUserId}
                  onClick={() => void handleCopyUserId()}
                  type="button"
                  variant="outline"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-xl transition-shadow" id="account-mfa-settings">
          <MfaSettingsCard onChanged={auth.refresh} user={user} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Change your password using your current password or an email code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setPasswordMode('current')
                  setPasswordOtp('')
                  setPasswordErrors({})
                }}
                type="button"
                variant={passwordMode === 'current' ? 'default' : 'outline'}
              >
                Current password
              </Button>
              <Button
                onClick={() => {
                  setPasswordMode('email')
                  setPasswordTotpCode('')
                  setPasswordErrors({})
                }}
                type="button"
                variant={passwordMode === 'email' ? 'default' : 'outline'}
              >
                Email code
              </Button>
            </div>

            {passwordMode === 'current' ? (
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
                  Current password
                </label>
                <PasswordInput
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value)
                    setPasswordErrors((current) => ({ ...current, currentPassword: '' }))
                  }}
                />
                {passwordErrors.currentPassword ? (
                  <p className="text-sm text-danger">{passwordErrors.currentPassword}</p>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
                    Email code
                  </label>
                  <Input
                    autoComplete="one-time-code"
                    className="h-11 text-center font-mono text-base tracking-[0.4em]"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) => {
                      setPasswordOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                      setPasswordErrors((current) => ({ ...current, otp: '' }))
                    }}
                    placeholder="000000"
                    value={passwordOtp}
                  />
                  {passwordErrors.otp ? (
                    <p className="text-sm text-danger">{passwordErrors.otp}</p>
                  ) : null}
                </div>
                <Button
                  className="mt-6 h-11"
                  disabled={isSendingPasswordOtp}
                  onClick={() => void handleSendPasswordOtp()}
                  type="button"
                  variant="outline"
                >
                  {isSendingPasswordOtp
                    ? 'Sending...'
                    : passwordOtpSent
                      ? 'Send again'
                      : 'Send code'}
                </Button>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
                New password
              </label>
              <PasswordInput
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value)
                  setPasswordErrors((current) => ({ ...current, newPassword: '', password: '' }))
                }}
              />
              {passwordErrors.newPassword || passwordErrors.password ? (
                <p className="text-sm text-danger">
                  {passwordErrors.newPassword ?? passwordErrors.password}
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
                Confirm password
              </label>
              <PasswordInput
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  setPasswordErrors((current) => ({ ...current, confirmPassword: '' }))
                }}
              />
              {passwordErrors.confirmPassword ? (
                <p className="text-sm text-danger">{passwordErrors.confirmPassword}</p>
              ) : null}
            </div>

            {passwordMode === 'current' && user.twoFactorEnabled ? (
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
                  Authenticator code
                </label>
                <Input
                  autoComplete="one-time-code"
                  className="h-11 text-center font-mono text-base tracking-[0.4em]"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => {
                    setPasswordTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    setPasswordErrors((current) => ({ ...current, totpCode: '' }))
                  }}
                  placeholder="000000"
                  value={passwordTotpCode}
                />
                {passwordErrors.totpCode ? (
                  <p className="text-sm text-danger">{passwordErrors.totpCode}</p>
                ) : null}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button
                disabled={isChangingPassword}
                onClick={() => void handleChangePassword()}
                type="button"
              >
                {isChangingPassword ? 'Changing password...' : 'Change password'}
              </Button>
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
