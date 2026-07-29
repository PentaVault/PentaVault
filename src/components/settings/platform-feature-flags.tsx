'use client'

import { Flag, Loader2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  useCreateFeatureFlag,
  useDeleteFeatureFlag,
  usePlatformFeatureFlags,
  useUpdateFeatureFlag,
} from '@/lib/hooks/use-platform'
import { useToast } from '@/lib/hooks/use-toast'
import type { FeatureFlag, FeatureFlagStatus } from '@/lib/types/api'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

const STATUS_LABELS: Record<FeatureFlagStatus, string> = {
  disabled: 'Off',
  enabled: 'On',
  rollout: 'Rollout',
}

const STATUS_STYLES: Record<FeatureFlagStatus, string> = {
  disabled: 'border-border text-muted-foreground',
  enabled: 'border-accent/40 bg-accent-muted text-accent-strong',
  rollout: 'border-sapphire/40 bg-sapphire-muted text-sapphire',
}

function targetingCount(flag: FeatureFlag): number {
  const { organizationIds = [], projectIds = [], userIds = [] } = flag.targeting
  return organizationIds.length + projectIds.length + userIds.length
}

function FlagRow({ flag }: { flag: FeatureFlag }) {
  const { toast } = useToast()
  const updateFlag = useUpdateFeatureFlag()
  const deleteFlag = useDeleteFeatureFlag()
  const [rollout, setRollout] = useState(String(flag.rolloutPercentage))

  async function applyStatus(status: FeatureFlagStatus): Promise<void> {
    try {
      await updateFlag.mutateAsync({ key: flag.key, input: { status } })
      toast.success(`"${flag.key}" is now ${STATUS_LABELS[status].toLowerCase()}.`)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update this flag right now.'))
    }
  }

  async function applyRollout(): Promise<void> {
    const parsed = Number(rollout)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      toast.error('Rollout must be a whole number between 0 and 100.')
      return
    }

    try {
      await updateFlag.mutateAsync({
        key: flag.key,
        input: { rolloutPercentage: parsed, status: 'rollout' },
      })
      toast.success(`"${flag.key}" is rolling out to ${parsed}% of users.`)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update the rollout right now.'))
    }
  }

  async function handleDelete(): Promise<void> {
    try {
      await deleteFlag.mutateAsync(flag.key)
      toast.success(`Deleted "${flag.key}".`)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to delete this flag right now.'))
    }
  }

  const targeted = targetingCount(flag)
  const denied = flag.targeting.deniedUserIds?.length ?? 0

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <code className="font-mono text-sm text-foreground">{flag.key}</code>
            <Badge className={cn('border', STATUS_STYLES[flag.status])}>
              {STATUS_LABELS[flag.status]}
              {flag.status === 'rollout' ? ` ${flag.rolloutPercentage}%` : ''}
            </Badge>
            {targeted > 0 ? (
              <Badge className="border border-border text-muted-foreground">
                {targeted} targeted
              </Badge>
            ) : null}
            {denied > 0 ? (
              <Badge className="border border-danger/40 text-danger">{denied} denied</Badge>
            ) : null}
          </div>
          {flag.description ? (
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{flag.description}</p>
          ) : null}
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {(['disabled', 'rollout', 'enabled'] as const).map((status) => (
            <Button
              disabled={updateFlag.isPending || flag.status === status}
              key={status}
              onClick={() => void applyStatus(status)}
              size="sm"
              type="button"
              variant={flag.status === status ? 'default' : 'outline'}
            >
              {STATUS_LABELS[status]}
            </Button>
          ))}

          <Button
            aria-label={`Delete flag ${flag.key}`}
            disabled={deleteFlag.isPending}
            onClick={() => void handleDelete()}
            size="sm"
            type="button"
            variant="outline"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {flag.status === 'rollout' ? (
        <div className="mt-3 flex items-center gap-2">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor={`rollout-${flag.key}`}
          >
            Rollout %
          </label>
          <Input
            className="w-24"
            id={`rollout-${flag.key}`}
            max={100}
            min={0}
            onChange={(event) => setRollout(event.target.value)}
            type="number"
            value={rollout}
          />
          <Button
            disabled={updateFlag.isPending || rollout === String(flag.rolloutPercentage)}
            onClick={() => void applyRollout()}
            size="sm"
            type="button"
            variant="outline"
          >
            Apply
          </Button>
          <p className="text-xs text-muted-foreground">
            Bucketing is per-user and stable, so the same people stay in the rollout as you raise
            it.
          </p>
        </div>
      ) : null}
    </div>
  )
}

export function PlatformFeatureFlags() {
  const { toast } = useToast()
  const { data, isPending, isError } = usePlatformFeatureFlags()
  const createFlag = useCreateFeatureFlag()
  const [key, setKey] = useState('')
  const [description, setDescription] = useState('')

  async function handleCreate(): Promise<void> {
    const normalizedKey = key.trim().toLowerCase()
    if (!normalizedKey) {
      toast.error('Flag key is required.')
      return
    }

    try {
      await createFlag.mutateAsync({
        key: normalizedKey,
        description: description.trim() || null,
      })
      setKey('')
      setDescription('')
      toast.success(`Created "${normalizedKey}". It starts off.`)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to create this flag right now.'))
    }
  }

  const flags = data?.flags ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-muted-foreground" />
          Feature flags
        </CardTitle>
        <CardDescription>
          Changes apply within about 15 seconds across every running instance. No redeploy is
          needed. New flags always start off.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap items-end gap-2 border-b border-border pb-4">
          <div className="min-w-[200px] flex-1 space-y-1">
            <label
              className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor="new-flag-key"
            >
              Flag key
            </label>
            <Input
              id="new-flag-key"
              onChange={(event) => setKey(event.target.value)}
              placeholder="new-billing-ui"
              value={key}
            />
          </div>

          <div className="min-w-[240px] flex-[2] space-y-1">
            <label
              className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor="new-flag-description"
            >
              Description
            </label>
            <Input
              id="new-flag-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this gates"
              value={description}
            />
          </div>

          <Button
            disabled={createFlag.isPending}
            onClick={() => void handleCreate()}
            size="sm"
            type="button"
          >
            {createFlag.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Create flag
          </Button>
        </div>

        {isPending ? (
          <p className="py-6 text-sm text-muted-foreground">Loading flags...</p>
        ) : isError ? (
          <p className="py-6 text-sm text-danger">Unable to load feature flags.</p>
        ) : flags.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No feature flags yet. Create one above to start gating a feature.
          </p>
        ) : (
          <div>
            {flags.map((flag) => (
              <FlagRow flag={flag} key={flag.id} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
