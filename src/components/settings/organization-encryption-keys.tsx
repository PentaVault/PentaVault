'use client'

import { KeySquare, Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  useAdoptOrganizationEncryptionKey,
  useOrganizationEncryptionKeys,
  useRewrapOrganizationEncryptionKey,
  useSetOrganizationEncryptionKeyActive,
} from '@/lib/hooks/use-organization-keys'
import { useToast } from '@/lib/hooks/use-toast'
import type { OrganizationEncryptionKey } from '@/lib/types/api'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

const REWRAP_LABELS: Record<OrganizationEncryptionKey['rewrapState'], string> = {
  // Adopting takes effect for new data immediately, so "pending" is a normal
  // resting state rather than an error.
  pending: 'Existing secrets have not been moved onto this key yet.',
  running: 'Moving existing secrets...',
  complete: 'All existing secrets have been moved onto this key.',
  failed: 'Some secrets could not be moved. Try again.',
}

function KeyRow({ encryptionKey }: { encryptionKey: OrganizationEncryptionKey }) {
  const { toast } = useToast()
  const setActive = useSetOrganizationEncryptionKeyActive()
  const rewrap = useRewrapOrganizationEncryptionKey()

  async function handleRewrap(): Promise<void> {
    try {
      const result = await rewrap.mutateAsync(encryptionKey.id)
      const { rewrapped, skipped, failed } = result.progress
      if (failed > 0) {
        toast.error(
          `${failed} secret${failed === 1 ? '' : 's'} could not be moved. ${rewrapped} moved.`
        )
        return
      }
      toast.success(
        `${rewrapped} secret${rewrapped === 1 ? '' : 's'} moved onto this key` +
          (skipped > 0 ? `, ${skipped} already there.` : '.')
      )
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to move existing secrets right now.'))
    }
  }

  async function toggleActive(): Promise<void> {
    try {
      await setActive.mutateAsync({
        keyId: encryptionKey.id,
        active: !encryptionKey.active,
      })
      toast.success(
        encryptionKey.active
          ? 'Key retired. It still opens existing secrets, but new ones use the PentaVault key.'
          : 'Key active. New secrets will be wrapped with it.'
      )
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update this key right now.'))
    }
  }

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{encryptionKey.region}</span>
            <Badge className="border border-border text-muted-foreground">
              {encryptionKey.provider}
            </Badge>
            <Badge
              className={cn(
                'border',
                encryptionKey.active
                  ? 'border-accent/40 bg-accent-muted text-accent-strong'
                  : 'border-border text-muted-foreground'
              )}
            >
              {encryptionKey.active ? 'Active' : 'Retired'}
            </Badge>
          </div>

          <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
            {encryptionKey.keyRef}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {encryptionKey.active
              ? 'New secrets are wrapped with this key.'
              : 'Retired — still opens secrets already sealed with it.'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {REWRAP_LABELS[encryptionKey.rewrapState]}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {encryptionKey.active ? (
            <Button
              disabled={rewrap.isPending}
              onClick={() => void handleRewrap()}
              size="sm"
              type="button"
              variant="outline"
            >
              {rewrap.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {rewrap.isPending ? 'Moving...' : 'Move existing secrets'}
            </Button>
          ) : null}
          <Button
            disabled={setActive.isPending}
            onClick={() => void toggleActive()}
            size="sm"
            type="button"
            variant={encryptionKey.active ? 'outline' : 'default'}
          >
            {encryptionKey.active ? 'Retire' : 'Make active'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function OrganizationEncryptionKeys() {
  const { toast } = useToast()
  const { data, isPending, isError } = useOrganizationEncryptionKeys()
  const adoptKey = useAdoptOrganizationEncryptionKey()
  const [keyRef, setKeyRef] = useState('')
  const [region, setRegion] = useState('')

  async function handleAdopt(): Promise<void> {
    if (!keyRef.trim() || !region.trim()) {
      toast.error('Both a key ARN and a region are required.')
      return
    }

    try {
      await adoptKey.mutateAsync({ keyRef: keyRef.trim(), region: region.trim() })
      setKeyRef('')
      setRegion('')
      toast.success('Key adopted. New secrets will be wrapped with it.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to adopt this key right now.'))
    }
  }

  const keys = data?.keys ?? []

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeySquare className="h-4 w-4 text-muted-foreground" />
          Encryption key
        </CardTitle>
        <CardDescription>
          Bring your own AWS KMS key. Adopting one changes what <em>new</em> secrets are wrapped
          with — everything already stored keeps opening under the key that sealed it, so this is
          never a switchover with downtime. PentaVault verifies it can wrap and unwrap with the key
          before saving it.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-3 border-b border-border pb-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                htmlFor="org-key-ref"
              >
                Key ARN
              </label>
              <Input
                id="org-key-ref"
                onChange={(event) => setKeyRef(event.target.value)}
                placeholder="arn:aws:kms:eu-west-1:000000000000:key/..."
                value={keyRef}
              />
            </div>

            <div className="space-y-1">
              <label
                className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                htmlFor="org-key-region"
              >
                Region
              </label>
              <Input
                id="org-key-region"
                onChange={(event) => setRegion(event.target.value)}
                placeholder="eu-west-1"
                value={region}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              disabled={adoptKey.isPending}
              onClick={() => void handleAdopt()}
              size="sm"
              type="button"
            >
              {adoptKey.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              {adoptKey.isPending ? 'Verifying key...' : 'Adopt key'}
            </Button>
          </div>
        </div>

        {isPending ? (
          <p className="py-6 text-sm text-muted-foreground">Loading keys...</p>
        ) : isError ? (
          <p className="py-6 text-sm text-danger">Unable to load encryption keys.</p>
        ) : keys.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Secrets are wrapped with PentaVault&apos;s own key. Adopt an AWS KMS key to hold that
            control yourself.
          </p>
        ) : (
          <div>
            {keys.map((encryptionKey) => (
              <KeyRow encryptionKey={encryptionKey} key={encryptionKey.id} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
