'use client'

import { Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  useAddTrustedIpRule,
  useOrganizationNetworkPolicy,
  useRemoveTrustedIpRule,
  useSetNetworkPolicyMode,
  useUpdateTrustedIpRule,
} from '@/lib/hooks/use-network-policy'
import { useToast } from '@/lib/hooks/use-toast'
import type { NetworkPolicyMode, TrustedIpRule } from '@/lib/types/api'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

const MODES: Array<{ description: string; label: string; value: NetworkPolicyMode }> = [
  {
    value: 'disabled',
    label: 'Off',
    description: 'Members can reach this organisation from anywhere.',
  },
  {
    value: 'monitor',
    label: 'Monitor',
    description:
      'Records every request the allowlist would have blocked, without blocking it. Use this first to find the networks nobody remembered.',
  },
  {
    value: 'enforce',
    label: 'Enforce',
    description: 'Requests from outside the allowlist are refused.',
  },
]

function RuleRow({
  canManage,
  organizationId,
  rule,
}: {
  canManage: boolean
  organizationId: string
  rule: TrustedIpRule
}) {
  const { toast } = useToast()
  const updateRule = useUpdateTrustedIpRule(organizationId)
  const removeRule = useRemoveTrustedIpRule(organizationId)
  const busy = updateRule.isPending || removeRule.isPending

  async function handleToggle(): Promise<void> {
    try {
      await updateRule.mutateAsync({ ruleId: rule.id, input: { enabled: !rule.enabled } })
      toast.success(rule.enabled ? 'Range disabled.' : 'Range enabled.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update this range right now.'))
    }
  }

  async function handleRemove(): Promise<void> {
    try {
      await removeRule.mutateAsync(rule.id)
      toast.success('Range removed from the allowlist.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to remove this range right now.'))
    }
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-medium">{rule.cidr}</span>
          {rule.enabled ? null : (
            <Badge className="border border-border text-muted-foreground">Disabled</Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{rule.description ?? 'No description'}</p>
      </div>

      {canManage ? (
        <div className="flex items-center gap-2">
          <Button
            disabled={busy}
            onClick={() => void handleToggle()}
            size="sm"
            type="button"
            variant="outline"
          >
            {rule.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            aria-label={`Remove ${rule.cidr} from the allowlist`}
            disabled={busy}
            onClick={() => void handleRemove()}
            size="sm"
            type="button"
            variant="outline"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function OrganizationTrustedIps({
  canManage = true,
  organizationId,
}: {
  canManage?: boolean
  organizationId: string
}) {
  const { toast } = useToast()
  const { data, isError, isPending } = useOrganizationNetworkPolicy(organizationId)
  const setMode = useSetNetworkPolicyMode(organizationId)
  const addRule = useAddTrustedIpRule(organizationId)
  const [cidr, setCidr] = useState('')
  const [description, setDescription] = useState('')

  const policy = data?.policy
  const requesterIp = data?.requesterIp ?? null

  async function handleAdd(): Promise<void> {
    const trimmed = cidr.trim()
    if (!trimmed) {
      toast.error('Enter an IP address or CIDR range.')
      return
    }

    try {
      const result = await addRule.mutateAsync({
        cidr: trimmed,
        description: description.trim() || null,
      })
      setCidr('')
      setDescription('')
      toast.success(`Added ${result.rule.cidr} to the allowlist.`)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to add that range right now.'))
    }
  }

  async function handleModeChange(mode: NetworkPolicyMode): Promise<void> {
    try {
      await setMode.mutateAsync(mode)
      toast.success(
        mode === 'enforce'
          ? 'Enforcing. Requests from outside the allowlist are now refused.'
          : mode === 'monitor'
            ? 'Monitoring. Nothing is blocked yet.'
            : 'Trusted IPs are off.'
      )
    } catch (error) {
      // The server refuses a change that would shut the person making it out,
      // and says which address it saw.
      toast.error(getApiFriendlyMessage(error, 'Unable to change the mode right now.'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Trusted IPs
        </CardTitle>
        <CardDescription>
          Limit which networks this organisation can be reached from. Sign-in stays available
          everywhere; what an untrusted network cannot do is reach this organisation&apos;s
          projects, secrets and settings.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading the allowlist…
          </p>
        ) : isError || !policy ? (
          <p className="text-sm text-muted-foreground">Unable to load the allowlist right now.</p>
        ) : (
          <>
            <div className="space-y-2">
              {MODES.map((mode) => (
                <label
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3"
                  key={mode.value}
                >
                  <input
                    checked={policy.mode === mode.value}
                    className="mt-1"
                    disabled={!canManage || setMode.isPending}
                    name="network-policy-mode"
                    onChange={() => void handleModeChange(mode.value)}
                    type="radio"
                    value={mode.value}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{mode.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {mode.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            {requesterIp ? (
              <p className="text-xs text-muted-foreground">
                This request reached the server from{' '}
                <span className="font-mono">{requesterIp}</span>. A change that would put your own
                address outside the allowlist is refused, because there would be no way back in.
              </p>
            ) : null}

            <div>
              {policy.rules.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No ranges yet. An enforcing allowlist with no ranges would admit nobody, so add
                  the network you are on before switching enforcement on.
                </p>
              ) : (
                policy.rules.map((rule) => (
                  <RuleRow
                    canManage={canManage}
                    key={rule.id}
                    organizationId={organizationId}
                    rule={rule}
                  />
                ))
              )}
            </div>

            {canManage ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1">
                  <label className="text-xs text-muted-foreground" htmlFor="trusted-ip-cidr">
                    IP address or CIDR range
                  </label>
                  <Input
                    id="trusted-ip-cidr"
                    onChange={(event) => setCidr(event.target.value)}
                    placeholder="203.0.113.0/24"
                    value={cidr}
                  />
                </div>
                <div className="min-w-[12rem] flex-1">
                  <label className="text-xs text-muted-foreground" htmlFor="trusted-ip-description">
                    Description
                  </label>
                  <Input
                    id="trusted-ip-description"
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="London office"
                    value={description}
                  />
                </div>
                <Button
                  disabled={addRule.isPending}
                  onClick={() => void handleAdd()}
                  type="button"
                  variant="outline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add range
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
