'use client'

import { CheckCircle2, Pencil, Plus, Radio, Trash2 } from 'lucide-react'
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
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch, SwitchThumb } from '@/components/ui/switch'
import {
  useCreateAuditLogStream,
  useDeleteAuditLogStream,
  useProjectAuditLogStreams,
  useUpdateAuditLogStream,
} from '@/lib/hooks/use-audit-log-streams'
import { useToast } from '@/lib/hooks/use-toast'
import type { CreateAuditLogStreamInput, UpdateAuditLogStreamInput } from '@/lib/types/api'
import type { AuditLogStream } from '@/lib/types/models'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type StreamForm = {
  name: string
  endpointUrl: string
  authToken: string
  enabled: boolean
}

const EMPTY_FORM: StreamForm = {
  name: '',
  endpointUrl: '',
  authToken: '',
  enabled: true,
}

function statusTone(status: number | null): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === null) return 'neutral'
  if (status >= 200 && status < 300) return 'success'
  if (status >= 400) return 'danger'
  return 'warning'
}

function streamToForm(stream: AuditLogStream): StreamForm {
  return {
    name: stream.name,
    endpointUrl: stream.endpointUrl,
    authToken: '',
    enabled: stream.enabled,
  }
}

export function ProjectAuditLogStreams({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const streamsQuery = useProjectAuditLogStreams(projectId)
  const createStream = useCreateAuditLogStream(projectId)
  const updateStream = useUpdateAuditLogStream(projectId)
  const deleteStream = useDeleteAuditLogStream(projectId)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStream, setEditingStream] = useState<AuditLogStream | null>(null)
  const [form, setForm] = useState<StreamForm>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<AuditLogStream | null>(null)

  const streams = streamsQuery.data?.streams ?? []
  const isSaving = createStream.isPending || updateStream.isPending

  function openCreate() {
    setEditingStream(null)
    setForm(EMPTY_FORM)
    setIsDialogOpen(true)
  }

  function openEdit(stream: AuditLogStream) {
    setEditingStream(stream)
    setForm(streamToForm(stream))
    setIsDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error('A stream name is required.')
      return
    }
    if (!form.endpointUrl.trim()) {
      toast.error('An endpoint URL is required.')
      return
    }
    try {
      if (editingStream) {
        const input: UpdateAuditLogStreamInput = {
          name: form.name.trim(),
          endpointUrl: form.endpointUrl.trim(),
          enabled: form.enabled,
        }
        if (form.authToken.trim()) {
          input.authToken = form.authToken.trim()
        }
        await updateStream.mutateAsync({ streamId: editingStream.id, input })
        toast.success('Audit log stream updated.')
      } else {
        const input: CreateAuditLogStreamInput = {
          name: form.name.trim(),
          endpointUrl: form.endpointUrl.trim(),
          enabled: form.enabled,
        }
        if (form.authToken.trim()) {
          input.authToken = form.authToken.trim()
        }
        await createStream.mutateAsync(input)
        toast.success('Audit log stream created.')
      }
      setIsDialogOpen(false)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to save this audit log stream right now.'))
    }
  }

  async function handleToggle(stream: AuditLogStream) {
    try {
      await updateStream.mutateAsync({ streamId: stream.id, input: { enabled: !stream.enabled } })
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update this stream right now.'))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteStream.mutateAsync(deleteTarget.id)
      toast.success('Audit log stream deleted.')
      setDeleteTarget(null)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to delete this stream right now.'))
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-border">
      <div className="flex flex-col justify-between gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Radio className="mt-0.5 h-5 w-5 text-accent" aria-hidden />
          <div>
            <p className="text-sm font-medium">Audit log streaming</p>
            <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
              Forward every audit event to an external SIEM over HTTPS. Endpoints are validated
              against private-network access; auth tokens are stored securely and never shown again.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} size="sm" type="button">
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          New stream
        </Button>
      </div>

      {streamsQuery.isError ? (
        <div className="px-4 py-4">
          <ErrorState
            title="Streams unavailable"
            message={getApiFriendlyMessage(streamsQuery.error, 'Unable to load audit log streams.')}
            onRetry={() => void streamsQuery.refetch()}
          />
        </div>
      ) : streams.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          No audit log streams yet. Add one to forward audit events to your SIEM.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {streams.map((stream) => (
            <li
              key={stream.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{stream.name}</span>
                  <StatusBadge tone={stream.enabled ? 'success' : 'neutral'}>
                    {stream.enabled ? 'Enabled' : 'Disabled'}
                  </StatusBadge>
                  {stream.hasToken ? <Badge>Authenticated</Badge> : null}
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {stream.endpointHost}
                </p>
                {stream.lastDeliveryAt ? (
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge tone={statusTone(stream.lastStatus)}>
                      {stream.lastStatus === null ? 'delivery failed' : `HTTP ${stream.lastStatus}`}
                    </StatusBadge>
                    {stream.lastError ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {stream.lastError}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  aria-label={`Toggle ${stream.name}`}
                  checked={stream.enabled}
                  className="relative h-5 w-9 rounded-full border border-border bg-background-elevated transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent/35"
                  disabled={updateStream.isPending}
                  onCheckedChange={() => void handleToggle(stream)}
                >
                  <SwitchThumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-foreground transition-transform data-[state=checked]:translate-x-4" />
                </Switch>
                <Button
                  aria-label={`Edit ${stream.name}`}
                  onClick={() => openEdit(stream)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  aria-label={`Delete ${stream.name}`}
                  onClick={() => setDeleteTarget(stream)}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/45" />
          <DialogContent className="fixed top-1/2 left-1/2 z-50 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-xl">
            <DialogTitle className="text-lg">
              {editingStream ? 'Edit audit log stream' : 'New audit log stream'}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Audit events for this project are forwarded to the endpoint as JSON.
            </DialogDescription>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="als-name">
                  Name
                </label>
                <Input
                  id="als-name"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="datadog"
                  value={form.name}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="als-endpoint">
                  Endpoint URL
                </label>
                <Input
                  id="als-endpoint"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, endpointUrl: event.target.value }))
                  }
                  placeholder="https://http-intake.logs.datadoghq.com/api/v2/logs"
                  value={form.endpointUrl}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="als-token">
                  Auth token{' '}
                  {editingStream ? (
                    <span className="text-muted-foreground">(leave blank to keep current)</span>
                  ) : (
                    <span className="text-muted-foreground">(optional)</span>
                  )}
                </label>
                <Input
                  id="als-token"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, authToken: event.target.value }))
                  }
                  placeholder="Sent as Authorization: Bearer …"
                  type="password"
                  value={form.authToken}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Enabled</span>
                <Switch
                  aria-label="Enable stream"
                  checked={form.enabled}
                  className="relative h-5 w-9 rounded-full border border-border bg-background-elevated transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent/35"
                  onCheckedChange={(value) =>
                    setForm((current) => ({ ...current, enabled: value }))
                  }
                >
                  <SwitchThumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-foreground transition-transform data-[state=checked]:translate-x-4" />
                </Switch>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button onClick={() => setIsDialogOpen(false)} type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={isSaving} onClick={() => void handleSubmit()} type="button">
                <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
                {editingStream ? 'Save changes' : 'Create stream'}
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
          <AlertDialogTitle>Delete audit log stream</AlertDialogTitle>
          <AlertDialogDescription>
            Audit events will no longer be forwarded to &quot;{deleteTarget?.name}&quot;. This
            cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteStream.isPending}
              onClick={() => void handleDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
