'use client'

import { Clock3, ExternalLink, Link2, LockKeyhole, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { CopyButton } from '@/components/shared/copy-button'
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
import { StatusBadge } from '@/components/ui/badge'
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
import { PasswordInput } from '@/components/ui/password-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCreateSecretShare,
  useProjectSecretShares,
  useRevokeSecretShare,
} from '@/lib/hooks/use-secret-shares'
import { useProjectSecrets } from '@/lib/hooks/use-secrets'
import { useToast } from '@/lib/hooks/use-toast'
import type { SecretShareAccessScope, SecretShareStatus } from '@/lib/types/models'
import { getApiFriendlyMessage } from '@/lib/utils/errors'
import { formatDateTime, formatRelativeDate } from '@/lib/utils/format'

const EXPIRIES = [
  { value: '15m', label: '15 minutes', milliseconds: 15 * 60 * 1_000 },
  { value: '1h', label: '1 hour', milliseconds: 60 * 60 * 1_000 },
  { value: '1d', label: '1 day', milliseconds: 24 * 60 * 60 * 1_000 },
  { value: '7d', label: '7 days', milliseconds: 7 * 24 * 60 * 60 * 1_000 },
  { value: '30d', label: '30 days', milliseconds: 30 * 24 * 60 * 60 * 1_000 },
] as const

type ShareForm = {
  secretId: string
  name: string
  expiry: (typeof EXPIRIES)[number]['value']
  maxViews: string
  password: string
  accessScope: SecretShareAccessScope
  recipients: string
}

const EMPTY_FORM: ShareForm = {
  secretId: '',
  name: '',
  expiry: '1d',
  maxViews: '1',
  password: '',
  accessScope: 'anyone',
  recipients: '',
}

function statusTone(status: SecretShareStatus) {
  if (status === 'active') return 'success' as const
  if (status === 'expired' || status === 'consumed') return 'warning' as const
  return 'danger' as const
}

function accessLabel(scope: SecretShareAccessScope) {
  if (scope === 'organization') return 'Organization members'
  if (scope === 'recipients') return 'Verified recipients'
  return 'Anyone with the link'
}

export function ProjectSecretShares({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const sharesQuery = useProjectSecretShares(projectId)
  const secretsQuery = useProjectSecrets(projectId)
  const createShare = useCreateSecretShare(projectId)
  const revokeShare = useRevokeSecretShare(projectId)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<ShareForm>(EMPTY_FORM)
  const [oneTimeUrl, setOneTimeUrl] = useState<string | null>(null)
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null)
  const secrets = useMemo(
    () => (secretsQuery.data ?? []).filter((secret) => secret.scope !== 'personal'),
    [secretsQuery.data]
  )

  function openCreate() {
    setForm({ ...EMPTY_FORM, secretId: secrets[0]?.id ?? '' })
    setOneTimeUrl(null)
    setCreateOpen(true)
  }

  function closeCreate() {
    setCreateOpen(false)
    setForm(EMPTY_FORM)
    setOneTimeUrl(null)
  }

  async function handleCreate() {
    const expiry = EXPIRIES.find((option) => option.value === form.expiry)
    const maxViews = Number(form.maxViews)
    const recipients = [
      ...new Set(
        form.recipients
          .split(/[\s,;]+/)
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      ),
    ]
    if (!form.secretId || !expiry) {
      toast.error('Choose a variable and expiry.')
      return
    }
    if (!Number.isInteger(maxViews) || maxViews < 1 || maxViews > 100) {
      toast.error('Maximum views must be between 1 and 100.')
      return
    }
    if (form.password && form.password.length < 8) {
      toast.error('Passwords must contain at least 8 characters.')
      return
    }
    if (form.accessScope === 'recipients' && recipients.length === 0) {
      toast.error('Add at least one recipient email.')
      return
    }

    try {
      const result = await createShare.mutateAsync({
        secretId: form.secretId,
        name: form.name.trim() || null,
        expiresAt: new Date(Date.now() + expiry.milliseconds).toISOString(),
        maxViews,
        password: form.password || null,
        accessScope: form.accessScope,
        authorizedEmails: form.accessScope === 'recipients' ? recipients : [],
      })
      setOneTimeUrl(`${window.location.origin}/share#${encodeURIComponent(result.token)}`)
      createShare.reset()
      setForm((current) => ({ ...current, password: '' }))
      toast.success('External share created. Copy the link now.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to create the external share.'))
    }
  }

  async function handleRevoke() {
    if (!revokeTargetId) return
    try {
      await revokeShare.mutateAsync(revokeTargetId)
      toast.success('External share revoked immediately.')
      setRevokeTargetId(null)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to revoke the external share.'))
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-border">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-4 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-medium">External secret shares</h3>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Send an immutable, encrypted snapshot with a strict expiry, view budget, and optional
            account or password checks.
          </p>
        </div>
        <Button
          disabled={secretsQuery.isLoading || secrets.length === 0}
          onClick={openCreate}
          size="sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Create share
        </Button>
      </div>

      {sharesQuery.isError ? (
        <div className="p-4">
          <ErrorState
            message={getApiFriendlyMessage(
              sharesQuery.error,
              'External shares could not be loaded.'
            )}
            onRetry={() => void sharesQuery.refetch()}
            title="Shares unavailable"
          />
        </div>
      ) : sharesQuery.isLoading ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">Loading external shares...</p>
      ) : (sharesQuery.data?.shares.length ?? 0) === 0 ? (
        <div className="px-4 py-8 text-center">
          <ShieldCheck className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No external shares</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a short-lived link instead of sending a value in chat or email.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {sharesQuery.data?.shares.map((share) => (
            <div className="flex flex-wrap items-center gap-4 px-4 py-3" key={share.id}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-mono text-sm">{share.name ?? share.secretName}</p>
                  <StatusBadge tone={statusTone(share.status)}>{share.status}</StatusBadge>
                  {share.passwordProtected ? (
                    <span title="Password protected">
                      <LockKeyhole className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {share.secretName} · {accessLabel(share.accessScope)} · {share.remainingViews} of{' '}
                  {share.maxViews} views remain
                </p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock3 className="h-3 w-3" />
                  Expires {formatRelativeDate(share.expiresAt)} · {formatDateTime(share.expiresAt)}
                </p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{share.tokenStart}...</span>
              {share.status === 'active' ? (
                <Button
                  aria-label={`Revoke ${share.name ?? share.secretName}`}
                  onClick={() => setRevokeTargetId(share.id)}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => (open ? setCreateOpen(true) : closeCreate())}
      >
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/45" />
          <DialogContent className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl">
            <DialogTitle className="text-lg">
              {oneTimeUrl ? 'Copy your one-time share link' : 'Create external share'}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              {oneTimeUrl
                ? 'PentaVault will not show this full link again.'
                : 'The value is snapshotted now and cannot be changed after sharing.'}
            </DialogDescription>

            {oneTimeUrl ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-md border border-warning/35 bg-warning-muted p-3">
                  <p className="text-xs text-warning">
                    Store the link in the intended secure channel. Closing this dialog removes it
                    from this page.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-md border border-border bg-background-elevated p-2">
                  <code className="min-w-0 flex-1 truncate text-xs">{oneTimeUrl}</code>
                  <CopyButton idleLabel="Copy link" successLabel="Copied" value={oneTimeUrl} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={closeCreate}>Done</Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <label
                  className="block space-y-1.5 text-xs text-muted-foreground"
                  htmlFor="share-secret"
                >
                  Variable
                  <Select
                    onValueChange={(secretId) => setForm((current) => ({ ...current, secretId }))}
                    value={form.secretId}
                  >
                    <SelectTrigger id="share-secret">
                      <SelectValue placeholder="Choose a variable" />
                    </SelectTrigger>
                    <SelectContent>
                      {secrets.map((secret) => (
                        <SelectItem key={secret.id} value={secret.id}>
                          {secret.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label
                  className="block space-y-1.5 text-xs text-muted-foreground"
                  htmlFor="share-name"
                >
                  Share name <span className="opacity-70">(optional)</span>
                  <Input
                    id="share-name"
                    maxLength={120}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Vendor handoff"
                    value={form.name}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label
                    className="block space-y-1.5 text-xs text-muted-foreground"
                    htmlFor="share-expiry"
                  >
                    Expires after
                    <Select
                      onValueChange={(expiry: ShareForm['expiry']) =>
                        setForm((current) => ({ ...current, expiry }))
                      }
                      value={form.expiry}
                    >
                      <SelectTrigger id="share-expiry">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPIRIES.map((expiry) => (
                          <SelectItem key={expiry.value} value={expiry.value}>
                            {expiry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label
                    className="block space-y-1.5 text-xs text-muted-foreground"
                    htmlFor="share-max-views"
                  >
                    Maximum views
                    <Input
                      id="share-max-views"
                      inputMode="numeric"
                      max={100}
                      min={1}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, maxViews: event.target.value }))
                      }
                      type="number"
                      value={form.maxViews}
                    />
                  </label>
                </div>
                <label
                  className="block space-y-1.5 text-xs text-muted-foreground"
                  htmlFor="share-access-scope"
                >
                  Who can access
                  <Select
                    onValueChange={(accessScope: SecretShareAccessScope) =>
                      setForm((current) => ({
                        ...current,
                        accessScope,
                        recipients: accessScope === 'recipients' ? current.recipients : '',
                      }))
                    }
                    value={form.accessScope}
                  >
                    <SelectTrigger id="share-access-scope">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anyone">Anyone with the link</SelectItem>
                      <SelectItem value="organization">Signed-in organization members</SelectItem>
                      <SelectItem value="recipients">Verified recipient emails</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                {form.accessScope === 'recipients' ? (
                  <label
                    className="block space-y-1.5 text-xs text-muted-foreground"
                    htmlFor="share-recipients"
                  >
                    Recipient emails
                    <Input
                      id="share-recipients"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, recipients: event.target.value }))
                      }
                      placeholder="partner@example.com, auditor@example.com"
                      value={form.recipients}
                    />
                    <span className="block text-[11px]">
                      Recipients must sign in with a verified matching email.
                    </span>
                  </label>
                ) : null}
                <label
                  className="block space-y-1.5 text-xs text-muted-foreground"
                  htmlFor="share-password"
                >
                  Password <span className="opacity-70">(optional)</span>
                  <PasswordInput
                    autoComplete="new-password"
                    id="share-password"
                    maxLength={256}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="At least 8 characters"
                    value={form.password}
                  />
                </label>
                <div className="flex justify-end gap-2 pt-1">
                  <Button disabled={createShare.isPending} onClick={closeCreate} variant="outline">
                    Cancel
                  </Button>
                  <Button
                    disabled={createShare.isPending || !form.secretId}
                    onClick={() => void handleCreate()}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {createShare.isPending ? 'Creating...' : 'Create share'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <AlertDialog
        open={Boolean(revokeTargetId)}
        onOpenChange={(open) => !open && setRevokeTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Revoke this external share?</AlertDialogTitle>
          <AlertDialogDescription>
            The link will stop working immediately. Values already viewed cannot be retracted.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={revokeShare.isPending} onClick={() => void handleRevoke()}>
              Revoke share
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
