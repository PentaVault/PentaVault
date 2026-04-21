'use client'

import { usePathname, useRouter } from 'next/navigation'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { organizationsApi } from '@/lib/api/organizations'
import { PROJECTS_PATH, getOrgProjectsPath } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

function getNextRoute(pathname: string, organizationId: string): string {
  if (/^\/dashboard\/org\/[^/]+\/projects\/[^/]+/.test(pathname)) {
    return getOrgProjectsPath(organizationId)
  }

  if (pathname.startsWith('/projects/')) {
    return PROJECTS_PATH
  }

  if (pathname.startsWith('/dashboard/org/')) {
    return pathname.replace(/^\/dashboard\/org\/[^/]+/, `/dashboard/org/${organizationId}`)
  }

  return pathname
}

export function useSwitchOrganization() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const auth = useAuth()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (organizationId: string) => organizationsApi.switch(organizationId),
    onSuccess: async (_, organizationId) => {
      await queryClient.invalidateQueries()
      await auth.refresh()
      router.replace(getNextRoute(pathname, organizationId))
    },
    onError: (error) => {
      toast.error(getApiFriendlyMessage(error, 'Unable to switch organisation right now.'))
    },
  })
}
