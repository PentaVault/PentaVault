'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Lock } from 'lucide-react'

import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/use-auth'
import { useCreateProjectAccessRequest } from '@/lib/hooks/use-projects'
import { useToast } from '@/lib/hooks/use-toast'
import { queryKeys } from '@/lib/query/keys'
import type { ListProjectsResponse } from '@/lib/types/api'
import { getApiErrorPayload, getApiFriendlyMessage } from '@/lib/utils/errors'

function formatRetryAfter(seconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(seconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }

  return `${remainingSeconds}s`
}

type ProjectAccessRequiredStateProps = {
  projectId: string
  description?: string
  title?: string
}

export function ProjectAccessRequiredState({
  projectId,
  description = "You don't have access to this project. Request access from a project admin.",
  title = 'Access required',
}: ProjectAccessRequiredStateProps) {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const createAccessRequest = useCreateProjectAccessRequest()
  const { toast } = useToast()

  const activeOrgId = auth.activeOrganization?.organization.id ?? null
  const canRequestAccess =
    auth.activeOrganization?.organization.membersCanRequestProjectAccess !== false
  const projectList = queryClient.getQueryData<ListProjectsResponse>(
    queryKeys.projects.list(activeOrgId)
  )
  const projectEntry =
    projectList?.projects.find((project) => project.project.id === projectId) ?? null

  async function handleRequestAccess(): Promise<void> {
    try {
      await createAccessRequest.mutateAsync({
        projectId,
        input: {
          requestedRole: 'member',
        },
      })
      toast.success("Access request sent. You'll be notified when it's reviewed.")
    } catch (error) {
      const payload = getApiErrorPayload(error)
      if (
        payload?.code === 'PROJECT_ACCESS_REQUEST_RETRY_COOLDOWN' &&
        typeof payload.retryAfter === 'number'
      ) {
        toast.error(`Please wait ${formatRetryAfter(payload.retryAfter)} before requesting again.`)
        return
      }

      toast.error(getApiFriendlyMessage(error, 'Unable to request access right now.'))
    }
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border py-16 text-center">
      <Lock className="mb-3 h-8 w-8 text-muted-foreground" />
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {projectEntry?.pendingAccessRequest ? (
        <StatusBadge className="mt-4" tone="warning">
          Request pending
        </StatusBadge>
      ) : canRequestAccess ? (
        <Button
          className="mt-4"
          disabled={createAccessRequest.isPending}
          onClick={() => void handleRequestAccess()}
          type="button"
        >
          {projectEntry?.latestRequestStatus === 'denied'
            ? 'Request access again'
            : 'Request access'}
        </Button>
      ) : null}
    </div>
  )
}
