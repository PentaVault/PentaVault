import { apiClient } from '@/lib/api/client'
import {
  announcementResponseSchema,
  announcementsResponseSchema,
  createAnnouncementInputSchema,
  createFeatureFlagInputSchema,
  featureFlagResponseSchema,
  featureFlagsResponseSchema,
  instanceStatsResponseSchema,
  parseApiInput,
  parseApiResponse,
  platformContextResponseSchema,
  updateAnnouncementInputSchema,
  updateFeatureFlagInputSchema,
} from '@/lib/api/schemas'
import type {
  AnnouncementResponse,
  AnnouncementsResponse,
  CreateAnnouncementInput,
  CreateFeatureFlagInput,
  FeatureFlagResponse,
  FeatureFlagsResponse,
  InstanceStatsResponse,
  PlatformContextResponse,
  UpdateAnnouncementInput,
  UpdateFeatureFlagInput,
} from '@/lib/types/api'

export const platformApi = {
  /**
   * Resolved flags plus visible announcements for the current caller. Served
   * from the backend's in-process cache, so it is cheap enough to fetch on
   * every app load.
   */
  async getContext(): Promise<PlatformContextResponse> {
    const response = await apiClient.get<PlatformContextResponse>('/v1/platform/context')
    return parseApiResponse(platformContextResponseSchema, response.data)
  },

  async getStats(): Promise<InstanceStatsResponse> {
    const response = await apiClient.get<InstanceStatsResponse>('/v1/platform/stats')
    return parseApiResponse(instanceStatsResponseSchema, response.data)
  },

  async listFlags(): Promise<FeatureFlagsResponse> {
    const response = await apiClient.get<FeatureFlagsResponse>('/v1/platform/flags')
    return parseApiResponse(featureFlagsResponseSchema, response.data)
  },

  async createFlag(input: CreateFeatureFlagInput): Promise<FeatureFlagResponse> {
    const response = await apiClient.post<FeatureFlagResponse>(
      '/v1/platform/flags',
      parseApiInput(createFeatureFlagInputSchema, input)
    )
    return parseApiResponse(featureFlagResponseSchema, response.data)
  },

  async updateFlag(key: string, input: UpdateFeatureFlagInput): Promise<FeatureFlagResponse> {
    const response = await apiClient.patch<FeatureFlagResponse>(
      `/v1/platform/flags/${encodeURIComponent(key)}`,
      parseApiInput(updateFeatureFlagInputSchema, input)
    )
    return parseApiResponse(featureFlagResponseSchema, response.data)
  },

  async deleteFlag(key: string): Promise<void> {
    await apiClient.delete(`/v1/platform/flags/${encodeURIComponent(key)}`)
  },

  async listAnnouncements(): Promise<AnnouncementsResponse> {
    const response = await apiClient.get<AnnouncementsResponse>('/v1/platform/announcements')
    return parseApiResponse(announcementsResponseSchema, response.data)
  },

  async createAnnouncement(input: CreateAnnouncementInput): Promise<AnnouncementResponse> {
    const response = await apiClient.post<AnnouncementResponse>(
      '/v1/platform/announcements',
      parseApiInput(createAnnouncementInputSchema, input)
    )
    return parseApiResponse(announcementResponseSchema, response.data)
  },

  async updateAnnouncement(
    announcementId: string,
    input: UpdateAnnouncementInput
  ): Promise<AnnouncementResponse> {
    const response = await apiClient.patch<AnnouncementResponse>(
      `/v1/platform/announcements/${encodeURIComponent(announcementId)}`,
      parseApiInput(updateAnnouncementInputSchema, input)
    )
    return parseApiResponse(announcementResponseSchema, response.data)
  },

  async deleteAnnouncement(announcementId: string): Promise<void> {
    await apiClient.delete(`/v1/platform/announcements/${encodeURIComponent(announcementId)}`)
  },
}
