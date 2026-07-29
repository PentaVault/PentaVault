import { apiClient } from '@/lib/api/client'
import {
  folderCommitsResponseSchema,
  folderDiffResponseSchema,
  parseApiResponse,
} from '@/lib/api/schemas'
import type {
  FolderCommitListParams,
  FolderCommitsResponse,
  FolderDiffResponse,
} from '@/lib/types/api'

export const folderCommitsApi = {
  async list(
    projectId: string,
    params: FolderCommitListParams = {}
  ): Promise<FolderCommitsResponse> {
    const response = await apiClient.get<FolderCommitsResponse>(
      `/v1/projects/${projectId}/folder-commits`,
      { params }
    )
    return parseApiResponse(folderCommitsResponseSchema, response.data)
  },

  async diff(projectId: string, from: string, to: string): Promise<FolderDiffResponse> {
    const response = await apiClient.get<FolderDiffResponse>(
      `/v1/projects/${projectId}/folder-commits/diff`,
      { params: { from, to } }
    )
    return parseApiResponse(folderDiffResponseSchema, response.data)
  },
}
