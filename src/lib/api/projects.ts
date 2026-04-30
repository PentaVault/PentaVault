import { apiClient } from '@/lib/api/client'
import {
  accessRequestResponseSchema,
  createProjectInputSchema,
  listAccessRequestsResponseSchema,
  listProjectsResponseSchema,
  parseApiInput,
  parseApiResponse,
  projectMembersResponseSchema,
  secretAccessRequestResponseSchema,
  updateProjectInputSchema,
  userProjectSchema,
} from '@/lib/api/schemas'
import type {
  AccessRequestResponse,
  CreateAccessRequestInput,
  CreateProjectInput,
  ListAccessRequestsResponse,
  ListProjectsResponse,
  ProjectMembersResponse,
  ProjectResponse,
  ReviewAccessRequestInput,
  UpdateProjectInput,
} from '@/lib/types/api'

export const projectsApi = {
  async listProjects(): Promise<ListProjectsResponse> {
    const response = await apiClient.get<ListProjectsResponse>('/v1/projects')
    return parseApiResponse(listProjectsResponseSchema, response.data)
  },

  async getProject(projectId: string): Promise<ProjectResponse> {
    const response = await apiClient.get<ProjectResponse>(`/v1/projects/${projectId}`)
    return parseApiResponse(userProjectSchema, response.data)
  },

  async createProject(input: CreateProjectInput): Promise<ProjectResponse> {
    const response = await apiClient.post<ProjectResponse>(
      '/v1/projects',
      parseApiInput(createProjectInputSchema, input)
    )
    return parseApiResponse(userProjectSchema, response.data)
  },

  async updateProject(projectId: string, input: UpdateProjectInput): Promise<ProjectResponse> {
    const response = await apiClient.patch<ProjectResponse>(
      `/v1/projects/${projectId}`,
      parseApiInput(updateProjectInputSchema, input)
    )
    return parseApiResponse(userProjectSchema, response.data)
  },

  async deleteProject(projectId: string): Promise<void> {
    await apiClient.delete(`/v1/projects/${projectId}`)
  },

  async archiveProject(projectId: string): Promise<ProjectResponse> {
    const response = await apiClient.patch<ProjectResponse>(`/v1/projects/${projectId}`, {
      status: 'archived',
    })
    return parseApiResponse(userProjectSchema, response.data)
  },

  async unarchiveProject(projectId: string): Promise<ProjectResponse> {
    const response = await apiClient.patch<ProjectResponse>(`/v1/projects/${projectId}`, {
      status: 'active',
    })
    return parseApiResponse(userProjectSchema, response.data)
  },

  async listMembers(projectId: string): Promise<ProjectMembersResponse> {
    const response = await apiClient.get<ProjectMembersResponse>(
      `/v1/projects/${projectId}/members`
    )
    return parseApiResponse(projectMembersResponseSchema, response.data)
  },

  async createAccessRequest(
    projectId: string,
    input: CreateAccessRequestInput
  ): Promise<AccessRequestResponse> {
    const response = await apiClient.post<AccessRequestResponse>(
      `/v1/projects/${projectId}/access-requests`,
      input
    )
    return parseApiResponse(accessRequestResponseSchema, response.data)
  },

  async listAccessRequests(
    projectId: string,
    status?: 'pending' | 'approved' | 'denied' | 'rejected' | 'cancelled'
  ): Promise<ListAccessRequestsResponse> {
    const response = await apiClient.get<ListAccessRequestsResponse>(
      `/v1/projects/${projectId}/access-requests`,
      {
        params: status ? { status } : undefined,
      }
    )
    return parseApiResponse(listAccessRequestsResponseSchema, response.data)
  },

  async reviewAccessRequest(
    requestId: string,
    input: ReviewAccessRequestInput
  ): Promise<AccessRequestResponse> {
    const response = await apiClient.patch<AccessRequestResponse>(
      `/v1/access-requests/${requestId}`,
      input
    )
    return parseApiResponse(accessRequestResponseSchema, response.data)
  },

  async createSecretAccessRequest(
    projectId: string,
    secretId: string
  ): Promise<{ requested: true }> {
    const response = await apiClient.post<{ requested: true }>(
      `/v1/projects/${projectId}/secrets/${secretId}/access-requests`
    )
    return parseApiResponse(secretAccessRequestResponseSchema, response.data)
  },
}
