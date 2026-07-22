'use client'

import { CheckCircle2, Pencil, Plug, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ErrorState } from '@/components/shared/error-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCreateAppConnection,
  useDeleteAppConnection,
  useOrganizationAppConnections,
  useUpdateAppConnection,
} from '@/lib/hooks/use-app-connections'
import { useToast } from '@/lib/hooks/use-toast'
import type { CreateAppConnectionInput, UpdateAppConnectionInput } from '@/lib/types/api'
import type { AppConnection, AppConnectionProvider } from '@/lib/types/models'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type CredentialField = { key: string; label: string; secret: boolean }

const PROVIDERS: Array<{
  value: AppConnectionProvider
  label: string
  credentialFields: CredentialField[]
}> = [
  {
    value: 'github',
    label: 'GitHub',
    credentialFields: [{ key: 'token', label: 'Personal access token', secret: true }],
  },
  {
    value: 'vercel',
    label: 'Vercel',
    credentialFields: [
      { key: 'token', label: 'API token', secret: true },
      { key: 'teamId', label: 'Team ID (optional)', secret: false },
    ],
  },
  {
    value: 'aws',
    label: 'AWS',
    credentialFields: [
      { key: 'accessKeyId', label: 'Access key ID', secret: false },
      { key: 'secretAccessKey', label: 'Secret access key', secret: true },
    ],
  },
  {
    value: 'gcp',
    label: 'Google Cloud',
    credentialFields: [{ key: 'serviceAccountKey', label: 'Service account JSON', secret: true }],
  },
  {
    value: 'openai',
    label: 'OpenAI',
    credentialFields: [{ key: 'apiKey', label: 'API key', secret: true }],
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    credentialFields: [{ key: 'apiKey', label: 'API key', secret: true }],
  },
  {
    value: 'generic',
    label: 'Generic',
    credentialFields: [{ key: 'token', label: 'Token', secret: true }],
  },
]

function providerLabel(provider: AppConnectionProvider): string {
  return PROVIDERS.find((entry) => entry.value === provider)?.label ?? provider
}

function fieldsFor(provider: AppConnectionProvider): CredentialField[] {
  return PROVIDERS.find((entry) => entry.value === provider)?.credentialFields ?? []
}

type ConnectionForm = {
  name: string
  provider: AppConnectionProvider
  credential: Record<string, string>
}

const EMPTY_FORM: ConnectionForm = {
  name: '',
  provider: 'github',
  credential: {},
}

export function OrganizationAppConnections({ organizationId }: { organizationId: string }) {
  const { toast } = useToast()
  const connectionsQuery = useOrganizationAppConnections(organizationId)
  const createConnection = useCreateAppConnection(organizationId)
  const updateConnection = useUpdateAppConnection(organizationId)
  const deleteConnection = useDeleteAppConnection(organizationId)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AppConnection | null>(null)
  const [form, setForm] = useState<ConnectionForm>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<AppConnection | null>(null)

  const connections = connectionsQuery.data?.connections ?? []
  const isSaving = createConnection.isPending || updateConnection.isPending

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setIsDialogOpen(true)
  }

  function openEdit(connection: AppConnection) {
    setEditing(connection)
    // Credentials are never returned; editing starts blank and only overwrites
    // the stored credential when at least one field is filled in.
    setForm({ name: connection.name, provider: connection.provider, credential: {} })
    setIsDialogOpen(true)
  }

  function setCredentialField(key: string, value: string) {
    setForm((current) => ({
      ...current,
      credential: { ...current.credential, [key]: value },
    }))
  }

  function collectCredential(): Record<string, string> {
    const entries = Object.entries(form.credential).filter(([, value]) => value.trim().length > 0)
    return Object.fromEntries(entries.map(([key, value]) => [key, value.trim()]))
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error('A connection name is required.')
      return
    }
    const credential = collectCredential()
    try {
      if (editing) {
        const input: UpdateAppConnectionInput = { name: form.name.trim() }
        if (Object.keys(credential).length > 0) {
          input.credential = credential
        }
        await updateConnection.mutateAsync({ connectionId: editing.id, input })
        toast.success('Connection updated.')
      } else {
        if (Object.keys(credential).length === 0) {
          toast.error('Enter the connection credentials.')
          return
        }
        const input: CreateAppConnectionInput = {
          name: form.name.trim(),
          provider: form.provider,
          credential,
        }
        await createConnection.mutateAsync(input)
        toast.success('Connection created.')
      }
      setIsDialogOpen(false)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to save this connection right now.'))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteConnection.mutateAsync(deleteTarget.id)
      toast.success('Connection deleted.')
      setDeleteTarget(null)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to delete this connection right now.'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Plug className="mt-0.5 h-5 w-5 text-accent" aria-hidden />
            <div>
              <CardTitle>App connections</CardTitle>
              <CardDescription>
                Store external provider credentials once and reuse them across syncs and rotations.
                Credentials are encrypted and never displayed again.
              </CardDescription>
            </div>
          </div>
          <Button onClick={openCreate} size="sm" type="button">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            New connection
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {connectionsQuery.isError ? (
          <ErrorState
            title="Connections unavailable"
            message={getApiFriendlyMessage(connectionsQuery.error, 'Unable to load connections.')}
            onRetry={() => void connectionsQuery.refetch()}
          />
        ) : connections.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No app connections yet. Add one to reuse provider credentials across the organisation.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {connections.map((connection) => (
              <li
                key={connection.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{connection.name}</span>
                    <Badge>{providerLabel(connection.provider)}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Added{' '}
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                      new Date(connection.createdAt)
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    aria-label={`Edit ${connection.name}`}
                    onClick={() => openEdit(connection)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    aria-label={`Delete ${connection.name}`}
                    onClick={() => setDeleteTarget(connection)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-danger" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/45" />
          <DialogContent className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl">
            <DialogTitle className="text-lg">
              {editing ? 'Edit connection' : 'New connection'}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              {editing
                ? 'Leave credential fields blank to keep the stored value.'
                : 'Credentials are encrypted at rest and never returned by the API.'}
            </DialogDescription>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="apc-name">
                  Name
                </label>
                <Input
                  id="apc-name"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="github-prod"
                  value={form.name}
                />
              </div>

              {!editing ? (
                <div>
                  <label className="mb-1 block text-xs font-medium" htmlFor="apc-provider">
                    Provider
                  </label>
                  <Select
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        provider: value as AppConnectionProvider,
                        credential: {},
                      }))
                    }
                    value={form.provider}
                  >
                    <SelectTrigger id="apc-provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="space-y-3">
                {fieldsFor(editing ? editing.provider : form.provider).map((field) => (
                  <div key={field.key}>
                    <label className="mb-1 block text-xs font-medium" htmlFor={`apc-${field.key}`}>
                      {field.label}
                    </label>
                    <Input
                      id={`apc-${field.key}`}
                      onChange={(event) => setCredentialField(field.key, event.target.value)}
                      type={field.secret ? 'password' : 'text'}
                      value={form.credential[field.key] ?? ''}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button onClick={() => setIsDialogOpen(false)} type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={isSaving} onClick={() => void handleSubmit()} type="button">
                <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
                {editing ? 'Save changes' : 'Create connection'}
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete connection</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{deleteTarget?.name}&quot; will be removed and its stored credential destroyed.
            Anything relying on it will stop working. This cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConnection.isPending}
              onClick={() => void handleDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
