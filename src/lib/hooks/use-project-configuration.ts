import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { projectConfigurationApi } from '@/lib/api/project-configuration'
import { queryKeys } from '@/lib/query/keys'
import type {
  CreateConfigChangeRequestInput,
  CreateProjectConfigInput,
  CreateProjectEnvironmentInput,
  UpdateProjectSettingsInput,
} from '@/lib/types/api'

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

export function useProjectConfigs(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectConfigs.list(projectId),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to list project configs')
      }
      return projectConfigurationApi.listConfigs(projectId)
    },
    enabled: enabled && Boolean(projectId),
  })
}

export function useCreateProjectConfig(projectId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProjectConfigInput) => {
      if (!projectId) {
        throw new Error('projectId is required to create project configs')
      }
      return projectConfigurationApi.createConfig(projectId, input)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectConfigs.list(projectId),
      })
    },
  })
}

export function useDeleteProjectConfig(projectId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (configId: string) => {
      if (!projectId) {
        throw new Error('projectId is required to delete project configs')
      }
      return projectConfigurationApi.deleteConfig(projectId, configId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectConfigs.list(projectId),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectSecrets.all,
      })
    },
  })
}

export function useShareProjectConfig(projectId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { configId: string; userId: string }) => {
      if (!projectId) {
        throw new Error('projectId is required to share project configs')
      }
      return projectConfigurationApi.shareConfig(projectId, input.configId, input.userId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectConfigs.list(projectId),
      })
    },
  })
}

export function useConfigChangeRequests(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectConfigs.changeRequests(projectId),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to list config change requests')
      }
      return projectConfigurationApi.listChangeRequests(projectId)
    },
    enabled: enabled && Boolean(projectId),
  })
}

export function useCreateConfigChangeRequest(projectId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateConfigChangeRequestInput) => {
      if (!projectId) {
        throw new Error('projectId is required to create config change requests')
      }
      return projectConfigurationApi.createChangeRequest(projectId, input)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectConfigs.changeRequests(projectId),
      })
    },
  })
}

export function useApproveConfigChangeRequest(projectId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!projectId) {
        throw new Error('projectId is required to approve config change requests')
      }
      return projectConfigurationApi.approveChangeRequest(projectId, requestId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectConfigs.changeRequests(projectId),
      })
    },
  })
}

export function useMergeConfigChangeRequest(projectId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!projectId) {
        throw new Error('projectId is required to merge config change requests')
      }
      return projectConfigurationApi.mergeChangeRequest(projectId, requestId)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectConfigs.changeRequests(projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectSecrets.all,
        }),
      ])
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
