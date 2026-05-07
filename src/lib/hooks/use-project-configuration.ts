import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { projectConfigurationApi } from '@/lib/api/project-configuration'
import { queryKeys } from '@/lib/query/keys'
import type { CreateProjectEnvironmentInput, UpdateProjectSettingsInput } from '@/lib/types/api'

export function useProjectEnvironments(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectEnvironments.list(projectId),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to list project environments')
      }
      return projectConfigurationApi.listEnvironments(projectId)
    },
    enabled: enabled && Boolean(projectId),
  })
}

export function useCreateProjectEnvironment(projectId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProjectEnvironmentInput) => {
      if (!projectId) {
        throw new Error('projectId is required to create project environments')
      }
      return projectConfigurationApi.createEnvironment(projectId, input)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectEnvironments.list(projectId),
      })
    },
  })
}

export function useProjectSettings(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectSettings.detail(projectId),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to load project settings')
      }
      return projectConfigurationApi.getSettings(projectId)
    },
    enabled: enabled && Boolean(projectId),
  })
}

export function useUpdateProjectSettings(projectId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateProjectSettingsInput) => {
      if (!projectId) {
        throw new Error('projectId is required to update project settings')
      }
      return projectConfigurationApi.updateSettings(projectId, input)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectSettings.detail(projectId),
      })
    },
  })
}
