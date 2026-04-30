'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { PropsWithChildren } from 'react'
import { useEffect, useState } from 'react'

import { DEFAULT_QUERY_STALE_TIME_MS } from '@/lib/constants'
import { env } from '@/lib/env'
import {
  AUTH_EXPIRED_EVENT,
  clearAuthenticatedQueryCache,
  SENSITIVE_QUERY_GC_TIME_MS,
} from '@/lib/query/cache'
import { queryKeys } from '@/lib/query/keys'
import { getApiErrorStatus } from '@/lib/utils/errors'

type QueryProviderProps = PropsWithChildren

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: DEFAULT_QUERY_STALE_TIME_MS,
          gcTime: 5 * 60 * 1000,
          retry: (failureCount, error) => {
            const status = getApiErrorStatus(error)

            if (status && [400, 401, 403, 404].includes(status)) {
              return false
            }

            return failureCount < 1
          },
          refetchOnWindowFocus: false,
        },
        mutations: {
          retry: false,
        },
      },
    })

    for (const key of [
      queryKeys.projectSecrets.all,
      queryKeys.projectTokens.all,
      queryKeys.projectAudit.all,
      queryKeys.projectSecurityAlerts.all,
      queryKeys.projectSecurityRecommendations.all,
    ]) {
      client.setQueryDefaults(key, {
        gcTime: SENSITIVE_QUERY_GC_TIME_MS,
        staleTime: 0,
        retry: false,
      })
    }

    return client
  })

  useEffect(() => {
    function handleAuthExpired() {
      clearAuthenticatedQueryCache(queryClient)
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {env.isDev ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}
