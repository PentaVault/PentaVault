import { apiClient } from '@/lib/api/client'
import {
  createSecretSnapshotInputSchema,
  parseApiInput,
  parseApiResponse,
  restoreSecretSnapshotResponseSchema,
  secretSnapshotResponseSchema,
  secretSnapshotsResponseSchema,
} from '@/lib/api/schemas'
import type {
  CreateSecretSnapshotInput,
  RestoreSecretSnapshotResponse,
  SecretSnapshotResponse,
  SecretSnapshotsResponse,
} from '@/lib/types/api'

export const secretSnapshotsApi = {
  async list(projectId: string, configId?: string): Promise<SecretSnapshotsResponse> {
    const response = await apiClient.get<SecretSnapshotsResponse>(
      `/v1/projects/${projectId}/secret-snapshots`,
      { params: configId ? { configId } : undefined }
    )
    return parseApiResponse(secretSnapshotsResponseSchema, response.data)
  },

  async create(
    projectId: string,
    input: CreateSecretSnapshotInput
  ): Promise<SecretSnapshotResponse> {
    const response = await apiClient.post<SecretSnapshotResponse>(
      `/v1/projects/${projectId}/secret-snapshots`,
      parseApiInput(createSecretSnapshotInputSchema, input)
    )
    return parseApiResponse(secretSnapshotResponseSchema, response.data)
  },

  async restore(projectId: string, snapshotId: string): Promise<RestoreSecretSnapshotResponse> {
    const response = await apiClient.post<RestoreSecretSnapshotResponse>(
      `/v1/projects/${projectId}/secret-snapshots/${snapshotId}/restore`
    )
    return parseApiResponse(restoreSecretSnapshotResponseSchema, response.data)
  },

  async remove(projectId: string, snapshotId: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete<{ deleted: boolean }>(
      `/v1/projects/${projectId}/secret-snapshots/${snapshotId}`
    )
    return response.data
  },
}
