'use client'

import { useQuery } from '@tanstack/react-query'

import { folderCommitsApi } from '@/lib/api/folder-commits'
import { queryKeys } from '@/lib/query/keys'
import type { FolderCommitListParams } from '@/lib/types/api'

export function useFolderCommits(
  projectId: string | null,
  params: FolderCommitListParams = {},
  enabled = true
) {
  const folderPath = params.folderPath ?? '/'
  return useQuery({
    queryKey: queryKeys.projectFolderCommits.list(projectId, folderPath),
    queryFn: async () => {
      if (!projectId) throw new Error('projectId is required to list folder commits')
      return folderCommitsApi.list(projectId, { ...params, folderPath })
    },
    enabled: enabled && Boolean(projectId),
  })
}

/**
 * Diffing needs two commits, so the query stays disabled until the user has
 * picked both endpoints.
 */
export function useFolderDiff(projectId: string | null, from: string | null, to: string | null) {
  return useQuery({
    queryKey: queryKeys.projectFolderCommits.diff(projectId, from ?? '', to ?? ''),
    queryFn: async () => {
      if (!projectId || !from || !to) throw new Error('Two commits are required to diff')
      return folderCommitsApi.diff(projectId, from, to)
    },
    enabled: Boolean(projectId) && Boolean(from) && Boolean(to),
  })
}
