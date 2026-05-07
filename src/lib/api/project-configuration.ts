import { apiClient } from '@/lib/api/client'
import {
  createProjectEnvironmentInputSchema,
  parseApiInput,
  parseApiResponse,
  projectEnvironmentResponseSchema,
  projectEnvironmentsResponseSchema,
  projectSettingsResponseSchema,
  updateProjectSettingsInputSchema,
} from '@/lib/api/schemas'
import type {
  CreateProjectEnvironmentInput,
  ProjectEnvironmentResponse,
  ProjectEnvironmentsResponse,
  ProjectSettingsResponse,
  UpdateProjectSettingsInput,
} from '@/lib/types/api'

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
