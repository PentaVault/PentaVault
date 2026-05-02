'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import { DASHBOARD_HOME_PATH } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/lib/hooks/use-toast'
import { clearProjectScopedQueryCache } from '@/lib/query/cache'
import { queryKeys } from '@/lib/query/keys'
import { getApiErrorCode, getApiFriendlyMessage } from '@/lib/utils/errors'

export function useSwitchOrganization() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const auth = useAuth()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (organizationId: string) => auth.setActiveOrganization({ organizationId }),
    onMutate: async () => {
      await queryClient.cancelQueries()
    },
    onSuccess: async () => {
      router.replace(DASHBOARD_HOME_PATH)
      await auth.refresh()
      clearProjectScopedQueryCache(queryClient)
      await queryClient.invalidateQueries({ refetchType: 'none' })
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizationMembers.all })
    },
    onError: (error) => {
      const message =
        getApiErrorCode(error) === 'ORG_NOT_FOUND'
          ? 'You no longer have access to that organisation. Refresh and ask an owner to invite you again if needed.'
          : getApiFriendlyMessage(error, 'Unable to switch organisation right now.')

      toast.error(message)
    },
  })
}
