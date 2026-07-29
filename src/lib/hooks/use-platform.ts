'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { platformApi } from '@/lib/api/platform'
import { queryKeys } from '@/lib/query/keys'
import type {
  CreateAnnouncementInput,
  CreateFeatureFlagInput,
  UpdateAnnouncementInput,
  UpdateFeatureFlagInput,
} from '@/lib/types/api'

/**
 * Every mutation refreshes the caller-facing context too, so an operator sees
 * their own change take effect immediately rather than waiting out the cache.
 */
function useInvalidatePlatform() {
  const queryClient = useQueryClient()
  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.platform.all })
  }, [queryClient])
}

export function usePlatformFeatureFlags(enabled = true) {
  return useQuery({
    queryKey: queryKeys.platform.flags,
    queryFn: () => platformApi.listFlags(),
    enabled,
  })
}

export function useInstanceStats(enabled = true) {
  return useQuery({
    queryKey: queryKeys.platform.stats,
    queryFn: () => platformApi.getStats(),
    enabled,
    // Counts are cached server-side for a minute; matching that avoids
    // pointless round trips when an operator switches tabs.
    staleTime: 60_000,
  })
}

export function useCreateFeatureFlag() {
  const invalidate = useInvalidatePlatform()
  return useMutation({
    mutationFn: (input: CreateFeatureFlagInput) => platformApi.createFlag(input),
    onSuccess: invalidate,
  })
}

export function useUpdateFeatureFlag() {
  const invalidate = useInvalidatePlatform()
  return useMutation({
    mutationFn: (payload: { key: string; input: UpdateFeatureFlagInput }) =>
      platformApi.updateFlag(payload.key, payload.input),
    onSuccess: invalidate,
  })
}

export function useDeleteFeatureFlag() {
  const invalidate = useInvalidatePlatform()
  return useMutation({
    mutationFn: (key: string) => platformApi.deleteFlag(key),
    onSuccess: invalidate,
  })
}

export function usePlatformAnnouncements(enabled = true) {
  return useQuery({
    queryKey: queryKeys.platform.announcements,
    queryFn: () => platformApi.listAnnouncements(),
    enabled,
  })
}

export function useCreateAnnouncement() {
  const invalidate = useInvalidatePlatform()
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => platformApi.createAnnouncement(input),
    onSuccess: invalidate,
  })
}

export function useUpdateAnnouncement() {
  const invalidate = useInvalidatePlatform()
  return useMutation({
    mutationFn: (payload: { announcementId: string; input: UpdateAnnouncementInput }) =>
      platformApi.updateAnnouncement(payload.announcementId, payload.input),
    onSuccess: invalidate,
  })
}

export function useDeleteAnnouncement() {
  const invalidate = useInvalidatePlatform()
  return useMutation({
    mutationFn: (announcementId: string) => platformApi.deleteAnnouncement(announcementId),
    onSuccess: invalidate,
  })
}
