'use client'

import { Check, Filter, RotateCw, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/hooks/use-auth'
import {
  useOrganizationAccessRequests,
  useProjectsQuery,
  useReviewProjectAccessRequest,
} from '@/lib/hooks/use-projects'
import { useToast } from '@/lib/hooks/use-toast'
import type { AccessRequest } from '@/lib/types/models'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type RequestStatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'

const FILTERS: RequestStatusFilter[] = ['all', 'pending', 'approved', 'rejected', 'cancelled']

export default function ChangeRequestsPage() {
  const auth = useAuth()
  const organizationId = auth.activeOrganization?.organization.id ?? null
  const role = auth.activeOrganization?.membership.role
  const canReview = role === 'owner' || role === 'admin'
  const [status, setStatus] = useState<RequestStatusFilter>('all')
  const [query, setQuery] = useState('')
  const requestsQuery = useOrganizationAccessRequests(
    organizationId,
    status === 'all' ? undefined : status
  )
  const projectsQuery = useProjectsQuery()
  const projectById = useMemo(() => {
    return new Map(
      (projectsQuery.data?.projects ?? []).map((item) => [item.project.id, item.project])
    )
  }, [projectsQuery.data?.projects])
  const requests = useMemo(() => {
    const term = query.trim().toLowerCase()
    const rows = requestsQuery.data?.requests ?? []
    if (!term) return rows
    return rows.filter((request) => {
      const project = projectById.get(request.projectId)
      const requester = request.requester?.name ?? request.requester?.email ?? request.requesterId
      return `${project?.name ?? ''} ${requester} ${request.status}`.toLowerCase().includes(term)
    })
  }, [projectById, query, requestsQuery.data?.requests])

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Change Requests</h1>
          <p className="text-sm text-muted-foreground">
            Review project access and config change work across this organisation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-72 max-w-full">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search requests..."
              value={query}
            />
          </div>
          <Button onClick={() => void requestsQuery.refetch()} type="button" variant="outline">
            <RotateCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {FILTERS.map((filter) => (
          <button
            className={`rounded-md border px-3 py-1.5 text-xs capitalize ${
              status === filter
                ? 'border-accent bg-accent/10 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
            key={filter}
            onClick={() => setStatus(filter)}
            type="button"
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {requestsQuery.isLoading ? (
          <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            Loading requests...
          </p>
        ) : requests.length === 0 ? (
          <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            No change requests match this view.
          </p>
        ) : (
          requests.map((request) => (
            <ChangeRequestCard
              canReview={canReview}
              key={request.id}
              projectName={projectById.get(request.projectId)?.name ?? 'Project'}
              request={request}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ChangeRequestCard({
  canReview,
  projectName,
  request,
}: {
  canReview: boolean
  projectName: string
  request: AccessRequest
}) {
  const { toast } = useToast()
  const reviewRequest = useReviewProjectAccessRequest(request.projectId)
  const requester = request.requester?.name ?? request.requester?.email ?? request.requesterId
  const isPending = request.status === 'pending'
  const statusTone =
    request.status === 'approved'
      ? 'success'
      : request.status === 'pending'
        ? 'warning'
        : request.status === 'rejected' || request.status === 'denied'
          ? 'danger'
          : 'neutral'

  async function handleReview(decision: 'approved' | 'rejected') {
    try {
      await reviewRequest.mutateAsync({
        requestId: request.id,
        input:
          decision === 'approved'
            ? { status: 'approved', grantedRole: 'member' }
            : { status: 'rejected' },
      })
      toast.success(
        decision === 'approved' ? 'Access request approved.' : 'Access request rejected.'
      )
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update this request right now.'))
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium">{projectName}</p>
          <p className="text-xs text-muted-foreground">{requester}</p>
        </div>
        <StatusBadge tone={statusTone}>{request.status}</StatusBadge>
      </div>

      <div className="bg-[#111317] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Project access request</h2>
            <p className="text-sm text-[#a8adb8]">requested role: {request.requestedRole}</p>
          </div>
          <StatusBadge tone={statusTone}>{request.status}</StatusBadge>
        </div>

        <div className="space-y-2">
          <DiffRow
            label="PROJECT_ACCESS"
            left="no project membership"
            right={request.requestedRole}
          />
          <DiffRow label="REQUESTER" left="not assigned" right={requester} />
        </div>

        {canReview && isPending ? (
          <div className="mt-4 flex justify-end gap-2">
            <Button
              disabled={reviewRequest.isPending}
              onClick={() => void handleReview('rejected')}
              size="sm"
              type="button"
              variant="outline"
            >
              <X className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              disabled={reviewRequest.isPending}
              onClick={() => void handleReview('approved')}
              size="sm"
              type="button"
            >
              <Check className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-right text-xs text-muted-foreground">
            {isPending
              ? 'Only organisation owners and admins can review requests.'
              : `This request is ${request.status}.`}
          </p>
        )}
      </div>
    </section>
  )
}

function DiffRow({ label, left, right }: { label: string; left: string; right: string }) {
  return (
    <div className="grid min-h-12 grid-cols-[minmax(120px,1fr)_32px_minmax(0,2fr)_32px_minmax(0,2fr)] items-center overflow-hidden rounded-md border border-[#303540] bg-[#181a20] text-sm">
      <div className="truncate px-4 font-mono font-semibold text-white">{label}</div>
      <div className="flex h-full items-center justify-center bg-[#3a1111] text-[#ff675f]">-</div>
      <div className="truncate px-4 font-mono text-[#a8adb8]">{left}</div>
      <div className="flex h-full items-center justify-center bg-[#0d3d23] text-[#04e985]">+</div>
      <div className="truncate px-4 font-mono text-[#dfe3ea]">{right}</div>
    </div>
  )
}
