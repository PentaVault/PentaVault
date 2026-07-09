'use client'

import { Check, KeyRound, Pencil, RefreshCw, Trash2, X } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/api/auth'
import { betterAuthClient } from '@/lib/auth/better-auth-client'
import { useAuth } from '@/lib/hooks/use-auth'
import { useAuthCapabilities } from '@/lib/hooks/use-auth-capabilities'
import { useToast } from '@/lib/hooks/use-toast'
import type { AuthPasskey } from '@/lib/types/api'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

const PASSKEY_NAME_MAX_LENGTH = 80

type PasskeySettingsCardProps = {
  onChanged?: () => Promise<void> | void
}

function normalizePasskeyName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

function validatePasskeyName(name: string): string | null {
  const normalizedName = normalizePasskeyName(name)

  if (!normalizedName) {
    return 'Enter a passkey name.'
  }

  if (normalizedName.length > PASSKEY_NAME_MAX_LENGTH) {
    return `Use ${PASSKEY_NAME_MAX_LENGTH} characters or fewer.`
  }

  return null
}

function getPasskeyLabel(passkey: AuthPasskey): string {
  return passkey.name?.trim() || 'Passkey'
}

export function PasskeySettingsCard({ onChanged }: PasskeySettingsCardProps) {
  const auth = useAuth()
  const { capabilities, isLoading: isCapabilitiesLoading } = useAuthCapabilities()
  const { toast } = useToast()
  const [passkeys, setPasskeys] = useState<AuthPasskey[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newPasskeyName, setNewPasskeyName] = useState('')
  const [newPasskeyNameError, setNewPasskeyNameError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingNameError, setEditingNameError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AuthPasskey | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const defaultPasskeyName = useMemo(() => {
    const accountLabel = auth.session?.user.email || auth.session?.user.name || 'account'
    return `PentaVault - ${accountLabel}`
  }, [auth.session?.user.email, auth.session?.user.name])

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

  useEffect(() => {
    setNewPasskeyName((current) => current || defaultPasskeyName)
  }, [defaultPasskeyName])

  async function handleAddPasskey(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const normalizedName = normalizePasskeyName(newPasskeyName)
    const validationError = validatePasskeyName(normalizedName)
    if (validationError) {
      setNewPasskeyNameError(validationError)
      return
    }

    try {
      setIsAdding(true)
      setNewPasskeyNameError(null)
      const result = await betterAuthClient.passkey.addPasskey({
        name: normalizedName,
      })

      if (result.error) {
        toast.error(result.error.message ?? 'Unable to add passkey.')
        return
      }

      toast.success('Passkey added.')
      setNewPasskeyName(defaultPasskeyName)
      await loadPasskeys()
      await onChanged?.()
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to add passkey.'))
    } finally {
      setIsAdding(false)
    }
  }

  function startEditingPasskey(passkey: AuthPasskey): void {
    setEditingId(passkey.id)
    setEditingName(getPasskeyLabel(passkey))
    setEditingNameError(null)
  }

  function cancelEditingPasskey(): void {
    setEditingId(null)
    setEditingName('')
    setEditingNameError(null)
  }

  async function handleUpdatePasskey(id: string): Promise<void> {
    const normalizedName = normalizePasskeyName(editingName)
    const validationError = validatePasskeyName(normalizedName)
    if (validationError) {
      setEditingNameError(validationError)
      return
    }

    try {
      setUpdatingId(id)
      setEditingNameError(null)
      await authApi.updatePasskey({ id, name: normalizedName })
      toast.success('Passkey renamed.')
      cancelEditingPasskey()
      await loadPasskeys()
      await onChanged?.()
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to rename passkey.'))
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDeletePasskey(): Promise<void> {
    if (!deleteTarget?.id) {
      toast.error('Select a passkey to remove.')
      return
    }

    try {
      setDeletingId(deleteTarget.id)
      await authApi.deletePasskey(deleteTarget.id)
      toast.success('Passkey removed.')
      if (editingId === deleteTarget.id) {
        cancelEditingPasskey()
      }
      setDeleteTarget(null)
      await loadPasskeys()
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
        <CardDescription>
          Name each passkey so it is easy to identify during sign-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-start"
          onSubmit={handleAddPasskey}
        >
          <div className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="new-passkey-name">
              New passkey name
            </label>
            <Input
              aria-describedby={newPasskeyNameError ? 'new-passkey-name-error' : undefined}
              aria-invalid={Boolean(newPasskeyNameError)}
              id="new-passkey-name"
              maxLength={PASSKEY_NAME_MAX_LENGTH}
              onChange={(event) => {
                setNewPasskeyName(event.target.value)
                if (newPasskeyNameError) {
                  setNewPasskeyNameError(null)
                }
              }}
              placeholder={defaultPasskeyName}
              value={newPasskeyName}
            />
            {newPasskeyNameError ? (
              <p className="mt-1 text-xs text-danger" id="new-passkey-name-error">
                {newPasskeyNameError}
              </p>
            ) : null}
          </div>
          <Button className="gap-2" disabled={isAdding} type="submit">
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
        </form>

        <div className="divide-y divide-border rounded-lg border border-border">
          {passkeys.length > 0 ? (
            passkeys.map((passkey) => (
              <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto]" key={passkey.id}>
                {editingId === passkey.id ? (
                  <div className="min-w-0">
                    <label className="sr-only" htmlFor={`passkey-name-${passkey.id}`}>
                      Passkey name
                    </label>
                    <Input
                      aria-describedby={
                        editingNameError ? `passkey-name-${passkey.id}-error` : undefined
                      }
                      aria-invalid={Boolean(editingNameError)}
                      id={`passkey-name-${passkey.id}`}
                      maxLength={PASSKEY_NAME_MAX_LENGTH}
                      onChange={(event) => {
                        setEditingName(event.target.value)
                        if (editingNameError) {
                          setEditingNameError(null)
                        }
                      }}
                      value={editingName}
                    />
                    {editingNameError ? (
                      <p
                        className="mt-1 text-xs text-danger"
                        id={`passkey-name-${passkey.id}-error`}
                      >
                        {editingNameError}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{getPasskeyLabel(passkey)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {passkey.deviceType ?? 'Device'}
                      {passkey.backedUp ? ' - synced' : ''}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2 sm:justify-end">
                  {editingId === passkey.id ? (
                    <>
                      <Button
                        aria-label="Save passkey name"
                        className="h-9 w-9 px-0"
                        disabled={updatingId === passkey.id}
                        onClick={() => void handleUpdatePasskey(passkey.id)}
                        type="button"
                        variant="outline"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label="Cancel passkey rename"
                        className="h-9 w-9 px-0"
                        disabled={updatingId === passkey.id}
                        onClick={cancelEditingPasskey}
                        type="button"
                        variant="outline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      aria-label={`Rename ${getPasskeyLabel(passkey)}`}
                      className="h-9 w-9 px-0"
                      onClick={() => startEditingPasskey(passkey)}
                      type="button"
                      variant="outline"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    aria-label={`Remove ${getPasskeyLabel(passkey)}`}
                    className="h-9 w-9 flex-shrink-0 px-0"
                    disabled={deletingId === passkey.id}
                    onClick={() => setDeleteTarget(passkey)}
                    type="button"
                    variant="outline"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-sm text-muted-foreground">
              {isLoading ? 'Loading...' : 'No passkeys added.'}
            </div>
          )}
        </div>
      </CardContent>
      <AlertDialog
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={Boolean(deleteTarget)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Remove this passkey?</AlertDialogTitle>
          <AlertDialogDescription>
            {deleteTarget
              ? `${getPasskeyLabel(deleteTarget)} will no longer be able to sign in to this account.`
              : 'This passkey will no longer be able to sign in to this account.'}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(deletingId)}
              onClick={(event) => {
                event.preventDefault()
                void handleDeletePasskey()
              }}
            >
              {deletingId ? 'Removing...' : 'Remove passkey'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
