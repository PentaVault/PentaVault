'use client'

import { Copy } from 'lucide-react'
import { useState } from 'react'

import { InlineEditField } from '@/components/settings/inline-edit-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/lib/api/auth'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

export default function AccountSettingsPage() {
  const auth = useAuth()
  const { toast } = useToast()
  const [isSavingName, setIsSavingName] = useState(false)
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
            <CardTitle>Profile</CardTitle>
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
                  <p className="font-mono text-muted-foreground text-xs tracking-[0.12em] uppercase">
                    User ID
                  </p>
                  <p className="mt-1 truncate font-mono text-foreground text-sm">{user.id}</p>
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
      </div>
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
