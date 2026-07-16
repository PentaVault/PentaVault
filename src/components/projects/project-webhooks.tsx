'use client'

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Webhook,
} from 'lucide-react'
import { useMemo, useState } from 'react'

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
import { Checkbox } from '@/components/ui/checkbox'
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
import { Switch, SwitchThumb } from '@/components/ui/switch'
import { useProjectEnvironments } from '@/lib/hooks/use-project-configuration'
import { useToast } from '@/lib/hooks/use-toast'
import {
  useCreateWebhook,
  useDeleteWebhook,
  useProjectWebhooks,
  useRetryWebhookDelivery,
  useTestWebhook,
  useUpdateWebhook,
  useWebhookDeliveries,
} from '@/lib/hooks/use-webhooks'
import type { CreateWebhookInput, UpdateWebhookInput } from '@/lib/types/api'
import type { OutboundWebhook, WebhookDeliveryStatus, WebhookEventType } from '@/lib/types/models'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

const WEBHOOK_EVENTS: Array<{ value: WebhookEventType; label: string; description: string }> = [
  {
    value: 'secrets.created',
    label: 'Secret created',
    description: 'A project secret is created.',
  },
  { value: 'secrets.updated', label: 'Secret updated', description: 'A secret value changes.' },
  {
    value: 'secrets.deleted',
    label: 'Secret deleted',
    description: 'A project secret is removed.',
  },
  {
    value: 'secrets.metadata_updated',
    label: 'Secret details updated',
    description: 'Folder, tags, or description changes.',
  },
  {
    value: 'secrets.version_restored',
    label: 'Version restored',
    description: 'A previous secret version becomes active.',
  },
]

type WebhookForm = {
  name: string
  endpointUrl: string
  signingSecret: string
  removeSigningSecret: boolean
  environmentId: string
  folderPath: string
  eventTypes: WebhookEventType[]
  enabled: boolean
  maxAttempts: string
}

const EMPTY_FORM: WebhookForm = {
  name: '',
  endpointUrl: '',
  signingSecret: '',
  removeSigningSecret: false,
  environmentId: 'all',
  folderPath: '/',
  eventTypes: WEBHOOK_EVENTS.map((event) => event.value),
  enabled: true,
  maxAttempts: '5',
}

function statusTone(status: WebhookDeliveryStatus | null) {
  if (status === 'succeeded') return 'success' as const
  if (status === 'retry_scheduled' || status === 'pending' || status === 'processing') {
    return 'warning' as const
  }
  if (status === 'dead_letter') return 'danger' as const
  return 'neutral' as const
}

function statusLabel(status: WebhookDeliveryStatus | null) {
  return status ? status.replaceAll('_', ' ') : 'not delivered'
}

function formatTimestamp(value: string | null) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function editForm(webhook: OutboundWebhook): WebhookForm {
  return {
    name: webhook.name,
    endpointUrl: '',
    signingSecret: '',
    removeSigningSecret: false,
    environmentId: webhook.environmentId ?? 'all',
    folderPath: webhook.folderPath,
    eventTypes: webhook.eventTypes,
    enabled: webhook.enabled,
    maxAttempts: String(webhook.maxAttempts),
  }
}

export function ProjectWebhooks({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const webhooksQuery = useProjectWebhooks(projectId)
  const environmentsQuery = useProjectEnvironments(projectId)
  const createWebhook = useCreateWebhook(projectId)
  const updateWebhook = useUpdateWebhook(projectId)
  const deleteWebhook = useDeleteWebhook(projectId)
  const testWebhook = useTestWebhook(projectId)
  const retryDelivery = useRetryWebhookDelivery(projectId)
  const [formOpen, setFormOpen] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<OutboundWebhook | null>(null)
  const [form, setForm] = useState<WebhookForm>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<OutboundWebhook | null>(null)
  const [deliveryWebhookId, setDeliveryWebhookId] = useState<string | null>(null)
  const deliveriesQuery = useWebhookDeliveries(
    projectId,
    deliveryWebhookId,
    Boolean(deliveryWebhookId)
  )
  const environments = environmentsQuery.data?.environments ?? []
  const environmentNames = useMemo(
    () => new Map(environments.map((environment) => [environment.id, environment.name])),
    [environments]
  )
  const isSaving = createWebhook.isPending || updateWebhook.isPending

  function openCreate() {
    setEditingWebhook(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEdit(webhook: OutboundWebhook) {
    setEditingWebhook(webhook)
    setForm(editForm(webhook))
    setFormOpen(true)
  }

  function toggleEvent(eventType: WebhookEventType, checked: boolean) {
    setForm((current) => ({
      ...current,
      eventTypes: checked
        ? [...new Set([...current.eventTypes, eventType])]
        : current.eventTypes.filter((value) => value !== eventType),
    }))
  }

  async function saveWebhook() {
    const maxAttempts = Number(form.maxAttempts)
    if (!form.name.trim() || (!editingWebhook && !form.endpointUrl.trim())) {
      toast.error('Name and HTTPS endpoint are required.')
      return
    }
    if (form.eventTypes.length === 0) {
      toast.error('Choose at least one event.')
      return
    }
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
      toast.error('Retry attempts must be between 1 and 10.')
      return
    }

    try {
      if (editingWebhook) {
        const input: UpdateWebhookInput = {
          name: form.name.trim(),
          environmentId: form.environmentId === 'all' ? null : form.environmentId,
          folderPath: form.folderPath.trim() || '/',
          eventTypes: form.eventTypes,
          enabled: form.enabled,
          maxAttempts,
        }
        if (form.endpointUrl.trim()) input.endpointUrl = form.endpointUrl.trim()
        if (form.removeSigningSecret) input.signingSecret = null
        else if (form.signingSecret.trim()) input.signingSecret = form.signingSecret.trim()
        await updateWebhook.mutateAsync({ webhookId: editingWebhook.id, input })
        toast.success('Webhook updated.')
      } else {
        const input: CreateWebhookInput = {
          name: form.name.trim(),
          endpointUrl: form.endpointUrl.trim(),
          environmentId: form.environmentId === 'all' ? null : form.environmentId,
          folderPath: form.folderPath.trim() || '/',
          eventTypes: form.eventTypes,
          enabled: form.enabled,
          maxAttempts,
          ...(form.signingSecret.trim() ? { signingSecret: form.signingSecret.trim() } : {}),
        }
        await createWebhook.mutateAsync(input)
        toast.success('Webhook created.')
      }
      setFormOpen(false)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to save this webhook right now.'))
    }
  }

  async function toggleEnabled(webhook: OutboundWebhook, enabled: boolean) {
    try {
      await updateWebhook.mutateAsync({ webhookId: webhook.id, input: { enabled } })
      toast.success(enabled ? 'Webhook enabled.' : 'Webhook paused.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update this webhook.'))
    }
  }

  async function sendTest(webhook: OutboundWebhook) {
    try {
      const result = await testWebhook.mutateAsync(webhook.id)
      if (result.delivery.status === 'succeeded') toast.success('Test delivery succeeded.')
      else toast.error(`Test delivery ${statusLabel(result.delivery.status)}.`)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to test this webhook.'))
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteWebhook.mutateAsync(deleteTarget.id)
      if (deliveryWebhookId === deleteTarget.id) setDeliveryWebhookId(null)
      setDeleteTarget(null)
      toast.success('Webhook deleted.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to delete this webhook.'))
    }
  }

  async function retry(deliveryId: string) {
    try {
      const result = await retryDelivery.mutateAsync(deliveryId)
      if (result.delivery.status === 'succeeded') toast.success('Delivery replay succeeded.')
      else toast.error(`Delivery replay ${statusLabel(result.delivery.status)}.`)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to replay this delivery.'))
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-border" aria-labelledby="webhooks-heading">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-medium" id="webhooks-heading">
              Outbound webhooks
            </h3>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Send signed, value-free secret events to deployment systems and integrations.
          </p>
        </div>
        <Button onClick={openCreate} size="sm" type="button">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add webhook
        </Button>
      </div>

      {webhooksQuery.isLoading ? (
        <div className="space-y-3 p-4">
          <div className="h-20 animate-pulse rounded-md bg-background-elevated" />
          <div className="h-20 animate-pulse rounded-md bg-background-elevated" />
        </div>
      ) : webhooksQuery.isError ? (
        <div className="p-4">
          <ErrorState
            title="Webhooks unavailable"
            message={getApiFriendlyMessage(webhooksQuery.error, 'Unable to load webhooks.')}
            onRetry={() => void webhooksQuery.refetch()}
          />
        </div>
      ) : (webhooksQuery.data?.webhooks.length ?? 0) === 0 ? (
        <div className="px-4 py-8 text-center">
          <Webhook className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No outbound webhooks</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add an HTTPS endpoint to automate work after secret changes.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {webhooksQuery.data?.webhooks.map((webhook) => {
            const deliveriesOpen = deliveryWebhookId === webhook.id
            return (
              <div key={webhook.id}>
                <div className="px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">{webhook.name}</p>
                        <StatusBadge tone={statusTone(webhook.lastStatus)}>
                          {statusLabel(webhook.lastStatus)}
                        </StatusBadge>
                        {webhook.hasSigningSecret ? <Badge>Signed</Badge> : <Badge>Unsigned</Badge>}
                      </div>
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        {webhook.endpointHost}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        <span>
                          {environmentNames.get(webhook.environmentId ?? '') ?? 'All environments'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{webhook.folderPath}</span>
                        <span aria-hidden="true">·</span>
                        <span>{webhook.eventTypes.length} events</span>
                        <span aria-hidden="true">·</span>
                        <span>Last delivery {formatTimestamp(webhook.lastDeliveryAt)}</span>
                      </div>
                      {webhook.lastError ? (
                        <p className="mt-2 line-clamp-2 text-xs text-danger">{webhook.lastError}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Switch
                        aria-label={`${webhook.enabled ? 'Disable' : 'Enable'} ${webhook.name}`}
                        checked={webhook.enabled}
                        className="relative h-5 w-9 rounded-full border border-border bg-background-elevated data-[state=checked]:border-accent data-[state=checked]:bg-accent/35"
                        disabled={updateWebhook.isPending}
                        onCheckedChange={(checked) => void toggleEnabled(webhook, checked)}
                      >
                        <SwitchThumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-foreground transition-transform data-[state=checked]:translate-x-4" />
                      </Switch>
                      <Button
                        disabled={testWebhook.isPending || !webhook.enabled}
                        onClick={() => void sendTest(webhook)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" /> Test
                      </Button>
                      <Button
                        onClick={() => openEdit(webhook)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        onClick={() => setDeliveryWebhookId(deliveriesOpen ? null : webhook.id)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        {deliveriesOpen ? (
                          <ChevronUp className="mr-1 h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="mr-1 h-3.5 w-3.5" />
                        )}
                        Deliveries
                      </Button>
                      <Button
                        aria-label={`Delete ${webhook.name}`}
                        onClick={() => setDeleteTarget(webhook)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-danger" />
                      </Button>
                    </div>
                  </div>
                </div>

                {deliveriesOpen ? (
                  <div className="border-t border-border bg-background-deep/35 px-4 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
                        Recent deliveries
                      </p>
                      <Button
                        aria-label="Refresh deliveries"
                        onClick={() => void deliveriesQuery.refetch()}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <RefreshCw
                          className={cn(
                            'h-3.5 w-3.5',
                            deliveriesQuery.isFetching && 'animate-spin'
                          )}
                        />
                      </Button>
                    </div>
                    {deliveriesQuery.isLoading ? (
                      <div className="h-14 animate-pulse rounded bg-background-elevated" />
                    ) : (deliveriesQuery.data?.deliveries.length ?? 0) === 0 ? (
                      <p className="text-xs text-muted-foreground">No deliveries yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {deliveriesQuery.data?.deliveries.slice(0, 10).map((delivery) => (
                          <div
                            className="flex flex-col gap-2 rounded-md border border-border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                            key={delivery.id}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              {delivery.status === 'succeeded' ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                              ) : delivery.status === 'dead_letter' ? (
                                <CircleAlert className="h-4 w-4 shrink-0 text-danger" />
                              ) : (
                                <Clock3 className="h-4 w-4 shrink-0 text-warning" />
                              )}
                              <div className="min-w-0">
                                <p className="truncate font-mono text-xs">{delivery.eventType}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {formatTimestamp(delivery.lastAttemptAt ?? delivery.createdAt)} ·
                                  attempt {delivery.attemptCount}
                                  {delivery.responseStatus
                                    ? ` · HTTP ${delivery.responseStatus}`
                                    : ''}
                                </p>
                                {delivery.lastError ? (
                                  <p className="mt-0.5 truncate text-xs text-danger">
                                    {delivery.lastError}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            {delivery.status === 'dead_letter' ? (
                              <Button
                                disabled={retryDelivery.isPending}
                                onClick={() => void retry(delivery.id)}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                Retry
                              </Button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/45" />
          <DialogContent className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl">
            <DialogTitle className="text-xl">
              {editingWebhook ? 'Edit webhook' : 'Add webhook'}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              HTTPS only. Payloads never include secret values or access tokens.
            </DialogDescription>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-medium" htmlFor="webhook-name">
                Name
                <Input
                  autoComplete="off"
                  id="webhook-name"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Production deploy"
                  value={form.name}
                />
              </label>
              <label className="space-y-1.5 text-xs font-medium" htmlFor="webhook-max-attempts">
                Retry attempts
                <Input
                  id="webhook-max-attempts"
                  inputMode="numeric"
                  max={10}
                  min={1}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, maxAttempts: event.target.value }))
                  }
                  type="number"
                  value={form.maxAttempts}
                />
              </label>
              <label
                className="space-y-1.5 text-xs font-medium sm:col-span-2"
                htmlFor="webhook-endpoint"
              >
                Endpoint URL
                <Input
                  autoComplete="off"
                  id="webhook-endpoint"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, endpointUrl: event.target.value }))
                  }
                  placeholder={
                    editingWebhook
                      ? `Leave blank to keep ${editingWebhook.endpointHost}`
                      : 'https://hooks.example.com/pentavault'
                  }
                  type="url"
                  value={form.endpointUrl}
                />
              </label>
              <label className="space-y-1.5 text-xs font-medium" htmlFor="webhook-environment">
                Environment
                <Select
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, environmentId: value }))
                  }
                  value={form.environmentId}
                >
                  <SelectTrigger id="webhook-environment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All environments</SelectItem>
                    {environments.map((environment) => (
                      <SelectItem key={environment.id} value={environment.id}>
                        {environment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-1.5 text-xs font-medium" htmlFor="webhook-folder">
                Folder scope
                <Input
                  autoComplete="off"
                  id="webhook-folder"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, folderPath: event.target.value }))
                  }
                  placeholder="/services/api"
                  value={form.folderPath}
                />
              </label>
              <label
                className="space-y-1.5 text-xs font-medium sm:col-span-2"
                htmlFor="webhook-signing-secret"
              >
                Signing secret
                <Input
                  autoComplete="new-password"
                  disabled={form.removeSigningSecret}
                  id="webhook-signing-secret"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, signingSecret: event.target.value }))
                  }
                  placeholder={
                    editingWebhook?.hasSigningSecret
                      ? 'Leave blank to keep current secret'
                      : 'At least 16 characters (recommended)'
                  }
                  type="password"
                  value={form.signingSecret}
                />
              </label>
              {editingWebhook?.hasSigningSecret ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
                  <Checkbox
                    aria-label="Remove request signing"
                    checked={form.removeSigningSecret}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        removeSigningSecret: checked,
                        signingSecret: '',
                      }))
                    }
                  />
                  Remove request signing
                </div>
              ) : null}
            </div>

            <fieldset className="mt-5">
              <legend className="text-xs font-medium">Events</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <div
                    className="flex items-start gap-2 rounded-md border border-border p-3"
                    key={event.value}
                  >
                    <Checkbox
                      aria-label={event.label}
                      checked={form.eventTypes.includes(event.value)}
                      onCheckedChange={(checked) => toggleEvent(event.value, checked)}
                    />
                    <span>
                      <span className="block text-xs font-medium">{event.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {event.description}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </fieldset>

            <div className="mt-5 flex items-center justify-between gap-4 rounded-md border border-border p-3">
              <span>
                <span className="block text-xs font-medium">Enabled</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Queue matching events immediately.
                </span>
              </span>
              <Switch
                aria-label="Enable webhook"
                checked={form.enabled}
                className="relative h-5 w-9 rounded-full border border-border bg-background-elevated data-[state=checked]:border-accent data-[state=checked]:bg-accent/35"
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, enabled: checked }))
                }
              >
                <SwitchThumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-foreground transition-transform data-[state=checked]:translate-x-4" />
              </Switch>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                disabled={isSaving}
                onClick={() => setFormOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={isSaving} onClick={() => void saveWebhook()} type="button">
                {isSaving ? 'Saving...' : editingWebhook ? 'Save changes' : 'Add webhook'}
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete webhook?</AlertDialogTitle>
          <AlertDialogDescription>
            {deleteTarget?.name} and its delivery history will be removed. This cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteWebhook.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteWebhook.isPending}
              onClick={() => void confirmDelete()}
            >
              {deleteWebhook.isPending ? 'Deleting...' : 'Delete webhook'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
