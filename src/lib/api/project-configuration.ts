import { apiClient } from '@/lib/api/client'
import {
  configChangeRequestResponseSchema,
  configChangeRequestsResponseSchema,
  createProjectConfigInputSchema,
  createProjectEnvironmentInputSchema,
  deleteProjectConfigResponseSchema,
  parseApiInput,
  parseApiResponse,
  projectConfigResponseSchema,
  projectConfigShareResponseSchema,
  projectConfigsResponseSchema,
  projectEnvironmentResponseSchema,
  projectEnvironmentsResponseSchema,
  projectSettingsResponseSchema,
  updateProjectSettingsInputSchema,
} from '@/lib/api/schemas'
import type {
  ConfigChangeRequestResponse,
  ConfigChangeRequestsResponse,
  CreateConfigChangeRequestInput,
  CreateProjectConfigInput,
  CreateProjectEnvironmentInput,
  DeleteProjectConfigResponse,
  ProjectConfigResponse,
  ProjectConfigShareResponse,
  ProjectConfigsResponse,
  ProjectEnvironmentResponse,
  ProjectEnvironmentsResponse,
  ProjectSettingsResponse,
  UpdateProjectSettingsInput,
} from '@/lib/types/api'
import { getApiErrorCode } from '@/lib/utils/errors'

export const projectConfigurationApi = {
  async listEnvironments(projectId: string): Promise<ProjectEnvironmentsResponse> {
    const response = await apiClient.get<ProjectEnvironmentsResponse>(
      `/v1/projects/${projectId}/environments`
    )
    return parseApiResponse(projectEnvironmentsResponseSchema, response.data)
  },

  async createEnvironment(
    projectId: string,
    input: CreateProjectEnvironmentInput
  ): Promise<ProjectEnvironmentResponse> {
    const response = await apiClient.post<ProjectEnvironmentResponse>(
      `/v1/projects/${projectId}/environments`,
      parseApiInput(createProjectEnvironmentInputSchema, input)
    )
    return parseApiResponse(projectEnvironmentResponseSchema, response.data)
  },

  async listConfigs(projectId: string): Promise<ProjectConfigsResponse> {
    try {
      const response = await apiClient.get<ProjectConfigsResponse>(
        `/v1/projects/${projectId}/configs`
      )
      return parseApiResponse(projectConfigsResponseSchema, response.data)
    } catch (error) {
      if (getApiErrorCode(error) === 'ROUTE_NOT_FOUND') {
        return { configs: [] }
      }

      throw error
    }
  },

  async createConfig(
    projectId: string,
    input: CreateProjectConfigInput
  ): Promise<ProjectConfigResponse> {
    const response = await apiClient.post<ProjectConfigResponse>(
      `/v1/projects/${projectId}/configs`,
      parseApiInput(createProjectConfigInputSchema, input)
    )
    return parseApiResponse(projectConfigResponseSchema, response.data)
  },

  async deleteConfig(projectId: string, configId: string): Promise<DeleteProjectConfigResponse> {
    const response = await apiClient.delete<DeleteProjectConfigResponse>(
      `/v1/projects/${projectId}/configs/${configId}`
    )
    return parseApiResponse(deleteProjectConfigResponseSchema, response.data)
  },

  async shareConfig(
    projectId: string,
    configId: string,
    userId: string
  ): Promise<ProjectConfigShareResponse> {
    const response = await apiClient.post<ProjectConfigShareResponse>(
      `/v1/projects/${projectId}/configs/${configId}/share`,
      { userId }
    )
    return parseApiResponse(projectConfigShareResponseSchema, response.data)
  },

  async unshareConfig(
    projectId: string,
    configId: string,
    userId: string
  ): Promise<{ removed: boolean; configId: string; userId: string }> {
    const response = await apiClient.delete<{ removed: boolean; configId: string; userId: string }>(
      `/v1/projects/${projectId}/configs/${configId}/share/${userId}`
    )
    return response.data
  },

  async listChangeRequests(projectId: string): Promise<ConfigChangeRequestsResponse> {
    const response = await apiClient.get<ConfigChangeRequestsResponse>(
      `/v1/projects/${projectId}/change-requests`
    )
    return parseApiResponse(configChangeRequestsResponseSchema, response.data)
  },

  async createChangeRequest(
    projectId: string,
    input: CreateConfigChangeRequestInput
  ): Promise<ConfigChangeRequestResponse> {
    const response = await apiClient.post<ConfigChangeRequestResponse>(
      `/v1/projects/${projectId}/change-requests`,
      input
    )
    return parseApiResponse(configChangeRequestResponseSchema, response.data)
  },

  async approveChangeRequest(
    projectId: string,
    requestId: string
  ): Promise<ConfigChangeRequestResponse> {
    const response = await apiClient.post<ConfigChangeRequestResponse>(
      `/v1/projects/${projectId}/change-requests/${requestId}/approve`
    )
    return parseApiResponse(configChangeRequestResponseSchema, response.data)
  },

  async mergeChangeRequest(
    projectId: string,
    requestId: string
  ): Promise<ConfigChangeRequestResponse> {
    const response = await apiClient.post<ConfigChangeRequestResponse>(
      `/v1/projects/${projectId}/change-requests/${requestId}/merge`
    )
    return parseApiResponse(configChangeRequestResponseSchema, response.data)
  },

  async getSettings(projectId: string): Promise<ProjectSettingsResponse> {
    const response = await apiClient.get<ProjectSettingsResponse>(
      `/v1/projects/${projectId}/settings`
    )
    return parseApiResponse(projectSettingsResponseSchema, response.data)
  },

  async updateSettings(
    projectId: string,
    input: UpdateProjectSettingsInput
  ): Promise<ProjectSettingsResponse> {
    const response = await apiClient.patch<ProjectSettingsResponse>(
      `/v1/projects/${projectId}/settings`,
      parseApiInput(updateProjectSettingsInputSchema, input)
    )
    return parseApiResponse(projectSettingsResponseSchema, response.data)
  },
}
