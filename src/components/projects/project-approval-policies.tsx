'use client'

import { GitPullRequestArrow, Loader2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  useCreateApprovalPolicy,
  useDeleteApprovalPolicy,
  useProjectApprovalPolicies,
  useUpdateApprovalPolicy,
} from '@/lib/hooks/use-approval-policies'
import { useToast } from '@/lib/hooks/use-toast'
import type { ApprovalPolicy } from '@/lib/types/api'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

function PolicyRow({ policy, projectId }: { policy: ApprovalPolicy; projectId: string }) {
  const { toast } = useToast()
  const updatePolicy = useUpdateApprovalPolicy(projectId)
  const deletePolicy = useDeleteApprovalPolicy(projectId)

  async function toggleEnabled(): Promise<void> {
    try {
      await updatePolicy.mutateAsync({
        policyId: policy.id,
        input: { enabled: !policy.enabled },
      })
      toast.success(policy.enabled ? 'Policy disabled.' : 'Policy enabled.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update this policy right now.'))
    }
  }

  async function handleDelete(): Promise<void> {
    try {
      await deletePolicy.mutateAsync(policy.id)
      toast.success(`Deleted "${policy.name}".`)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to delete this policy right now.'))
    }
  }

  const approverCount = policy.approverUserIds.length + policy.approverGroupIds.length

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{policy.name}</span>
            <code className="rounded bg-card-elevated px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              {policy.secretPath}
            </code>
            <Badge className="border border-sapphire/40 bg-sapphire-muted text-sapphire">
              {policy.requiredApprovals} approval{policy.requiredApprovals === 1 ? '' : 's'}
            </Badge>
            <Badge
              className={cn(
                'border',
                policy.enabled
                  ? 'border-accent/40 bg-accent-muted text-accent-strong'
                  : 'border-border text-muted-foreground'
              )}
            >
              {policy.enabled ? 'Active' : 'Disabled'}
            </Badge>
            {policy.allowSelfApproval ? (
              // Worth calling out: it removes separation of duties.
              <Badge className="border border-warning/40 bg-warning-muted text-warning">
                Self-approval allowed
              </Badge>
            ) : null}
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            {policy.environmentId ? 'Scoped to one environment' : 'All environments'}
            {approverCount > 0
              ? ` · ${approverCount} named approver${approverCount === 1 ? '' : 's'}`
              : ' · any eligible reviewer'}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            disabled={updatePolicy.isPending}
            onClick={() => void toggleEnabled()}
            size="sm"
            type="button"
            variant="outline"
          >
            {policy.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            aria-label={`Delete policy ${policy.name}`}
            disabled={deletePolicy.isPending}
            onClick={() => void handleDelete()}
            size="sm"
            type="button"
            variant="outline"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ProjectApprovalPolicies({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const { data, isPending, isError } = useProjectApprovalPolicies(projectId)
  const createPolicy = useCreateApprovalPolicy(projectId)
  const [name, setName] = useState('')
  const [secretPath, setSecretPath] = useState('/')
  const [requiredApprovals, setRequiredApprovals] = useState('2')

  async function handleCreate(): Promise<void> {
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error('Policy name is required.')
      return
    }

    const parsed = Number(requiredApprovals)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
      toast.error('Required approvals must be a whole number between 1 and 10.')
      return
    }

    try {
      await createPolicy.mutateAsync({
        name: trimmedName,
        secretPath: secretPath.trim() || '/',
        requiredApprovals: parsed,
      })
      setName('')
      setSecretPath('/')
      setRequiredApprovals('2')
      toast.success(`Created "${trimmedName}".`)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to create this policy right now.'))
    }
  }

  const policies = data?.policies ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitPullRequestArrow className="h-4 w-4 text-muted-foreground" />
          Approval policies
        </CardTitle>
        <CardDescription>
          The most specific policy governing a path decides how many approvals a change needs. With
          no policy, the project&apos;s default quorum applies. Authors never count toward their own
          quorum.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap items-end gap-2 border-b border-border pb-4">
          <div className="min-w-[180px] flex-1 space-y-1">
            <label
              className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor="new-policy-name"
            >
              Name
            </label>
            <Input
              id="new-policy-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Production changes"
              value={name}
            />
          </div>

          <div className="min-w-[140px] flex-1 space-y-1">
            <label
              className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor="new-policy-path"
            >
              Path
            </label>
            <Input
              id="new-policy-path"
              onChange={(event) => setSecretPath(event.target.value)}
              placeholder="/production"
              value={secretPath}
            />
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor="new-policy-approvals"
            >
              Approvals
            </label>
            <Input
              className="w-24"
              id="new-policy-approvals"
              max={10}
              min={1}
              onChange={(event) => setRequiredApprovals(event.target.value)}
              type="number"
              value={requiredApprovals}
            />
          </div>

          <Button
            disabled={createPolicy.isPending}
            onClick={() => void handleCreate()}
            size="sm"
            type="button"
          >
            {createPolicy.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add policy
          </Button>
        </div>

        {isPending ? (
          <p className="py-6 text-sm text-muted-foreground">Loading approval policies...</p>
        ) : isError ? (
          <p className="py-6 text-sm text-muted-foreground">
            Approval policies are unavailable. They require project admin access.
          </p>
        ) : policies.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No approval policies yet. Changes use the project&apos;s default approval quorum.
          </p>
        ) : (
          <div>
            {policies.map((policy) => (
              <PolicyRow key={policy.id} policy={policy} projectId={projectId} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
