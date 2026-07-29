'use client'

import { useQuery } from '@tanstack/react-query'
import { createContext, type PropsWithChildren, useContext, useMemo } from 'react'

import { platformApi } from '@/lib/api/platform'
import type { Announcement } from '@/lib/types/api'

type PlatformContextValue = {
  flags: Record<string, boolean>
  announcements: Announcement[]
  isPlatformAdmin: boolean
  isLoading: boolean
}

const PlatformContext = createContext<PlatformContextValue>({
  flags: {},
  announcements: [],
  isPlatformAdmin: false,
  isLoading: true,
})

/** Matches the backend cache TTL so the client is never the stale half. */
const PLATFORM_CONTEXT_STALE_MS = 15_000
/** Picks up a freshly published incident notice without a page reload. */
const PLATFORM_CONTEXT_REFETCH_MS = 60_000

export function PlatformProvider({ children }: PropsWithChildren) {
  const { data, isPending } = useQuery({
    queryKey: ['platform', 'context'],
    queryFn: () => platformApi.getContext(),
    staleTime: PLATFORM_CONTEXT_STALE_MS,
    refetchInterval: PLATFORM_CONTEXT_REFETCH_MS,
    refetchOnWindowFocus: true,
    // The platform surface must never take the app down with it: an unreachable
    // context endpoint degrades to "no flags, no announcements".
    retry: 1,
  })

  const value = useMemo<PlatformContextValue>(
    () => ({
      flags: data?.flags ?? {},
      announcements: data?.announcements ?? [],
      isPlatformAdmin: data?.isPlatformAdmin ?? false,
      isLoading: isPending,
    }),
    [data, isPending]
  )

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
}

/**
 * Resolve a single feature flag. Unknown keys are `false`, matching the
 * backend's deny-by-default evaluation, so a flag that has not been created yet
 * simply keeps its feature hidden.
 */
export function useFeatureFlag(key: string): boolean {
  return useContext(PlatformContext).flags[key] ?? false
}

export function useFeatureFlags(): Record<string, boolean> {
  return useContext(PlatformContext).flags
}

export function useAnnouncements(): Announcement[] {
  return useContext(PlatformContext).announcements
}

/**
 * Whether the signed-in user is an instance operator. UX only — the backend
 * re-checks the operator allowlist on every platform mutation.
 */
export function useIsPlatformAdmin(): boolean {
  return useContext(PlatformContext).isPlatformAdmin
}

export function usePlatformContext(): PlatformContextValue {
  return useContext(PlatformContext)
}
