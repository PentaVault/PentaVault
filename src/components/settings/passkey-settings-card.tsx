'use client'

import { KeyRound, RefreshCw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/lib/api/auth'
import { betterAuthClient } from '@/lib/auth/better-auth-client'
import { useAuthCapabilities } from '@/lib/hooks/use-auth-capabilities'
import { useToast } from '@/lib/hooks/use-toast'
import type { AuthPasskey } from '@/lib/types/api'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type PasskeySettingsCardProps = {
  onChanged?: () => Promise<void> | void
}

export function PasskeySettingsCard({ onChanged }: PasskeySettingsCardProps) {
  const { capabilities, isLoading: isCapabilitiesLoading } = useAuthCapabilities()
  const { toast } = useToast()
  const [passkeys, setPasskeys] = useState<AuthPasskey[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadPasskeys = useCallback(async (): Promise<void> => {
    if (!capabilities.passkey.enabled) {
      return
    }

    try {
      setIsLoading(true)
      setPasskeys(await authApi.listPasskeys())
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to load passkeys.'))
    } finally {
      setIsLoading(false)
    }
  }, [capabilities.passkey.enabled, toast])

  useEffect(() => {
    void loadPasskeys()
  }, [loadPasskeys])

  async function handleAddPasskey(): Promise<void> {
    try {
      setIsAdding(true)
      const result = await betterAuthClient.passkey.addPasskey({
        name: 'PentaVault passkey',
      })

      if (result.error) {
        toast.error(result.error.message ?? 'Unable to add passkey.')
        return
      }

      toast.success('Passkey added.')
      await loadPasskeys()
      await onChanged?.()
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to add passkey.'))
    } finally {
      setIsAdding(false)
    }
  }

  async function handleDeletePasskey(id: string): Promise<void> {
    try {
      setDeletingId(id)
      await authApi.deletePasskey(id)
      setPasskeys((current) => current.filter((passkey) => passkey.id !== id))
      toast.success('Passkey removed.')
      await onChanged?.()
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to remove passkey.'))
    } finally {
      setDeletingId(null)
    }
  }

  if (isCapabilitiesLoading) {
    return null
  }

  if (!capabilities.passkey.enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Passkeys</CardTitle>
          <CardDescription>
            Passkey sign-in is disabled on the backend. Set `AUTH_PASSKEY_ENABLED=true`, restart the
            API server, then refresh this page to add a passkey.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>Use a device passkey for passwordless sign-in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            className="gap-2"
            disabled={isAdding}
            onClick={() => void handleAddPasskey()}
            type="button"
          >
            <KeyRound className="h-4 w-4" />
            {isAdding ? 'Adding...' : 'Add passkey'}
          </Button>
          <Button
            aria-label="Refresh passkeys"
            className="h-10 w-10 px-0"
            disabled={isLoading}
            onClick={() => void loadPasskeys()}
            type="button"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="divide-y divide-border rounded-lg border border-border">
          {passkeys.length > 0 ? (
            passkeys.map((passkey) => (
              <div className="flex items-center justify-between gap-3 p-3" key={passkey.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{passkey.name || 'Passkey'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {passkey.deviceType ?? 'Device'}
                    {passkey.backedUp ? ' - synced' : ''}
                  </p>
                </div>
                <Button
                  aria-label="Remove passkey"
                  className="h-9 w-9 flex-shrink-0 px-0"
                  disabled={deletingId === passkey.id}
                  onClick={() => void handleDeletePasskey(passkey.id)}
                  type="button"
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          ) : (
            <div className="p-3 text-sm text-muted-foreground">
              {isLoading ? 'Loading...' : 'No passkeys added.'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
