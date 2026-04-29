import { apiClient } from '@/lib/api/client'
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
    return response.data
  },

  async getProject(projectId: string): Promise<ProjectResponse> {
    const response = await apiClient.get<ProjectResponse>(`/v1/projects/${projectId}`)
    return response.data
  },

  async createProject(input: CreateProjectInput): Promise<ProjectResponse> {
    const response = await apiClient.post<ProjectResponse>('/v1/projects', input)
    return response.data
  },

  async updateProject(projectId: string, input: UpdateProjectInput): Promise<ProjectResponse> {
    const response = await apiClient.patch<ProjectResponse>(`/v1/projects/${projectId}`, input)
    return response.data
  },

  async deleteProject(projectId: string): Promise<void> {
    await apiClient.delete(`/v1/projects/${projectId}`)
  },

  async archiveProject(projectId: string): Promise<ProjectResponse> {
    const response = await apiClient.patch<ProjectResponse>(`/v1/projects/${projectId}`, {
      status: 'archived',
    })
    return response.data
  },

  async unarchiveProject(projectId: string): Promise<ProjectResponse> {
    const response = await apiClient.patch<ProjectResponse>(`/v1/projects/${projectId}`, {
      status: 'active',
    })
    return response.data
  },

  async listMembers(projectId: string): Promise<ProjectMembersResponse> {
    const response = await apiClient.get<ProjectMembersResponse>(
      `/v1/projects/${projectId}/members`
    )
    return response.data
  },

  async createAccessRequest(
    projectId: string,
    input: CreateAccessRequestInput
  ): Promise<AccessRequestResponse> {
    const response = await apiClient.post<AccessRequestResponse>(
      `/v1/projects/${projectId}/access-requests`,
      input
    )
    return response.data
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
    return response.data
  },

  async reviewAccessRequest(
    requestId: string,
    input: ReviewAccessRequestInput
  ): Promise<AccessRequestResponse> {
    const response = await apiClient.patch<AccessRequestResponse>(
      `/v1/access-requests/${requestId}`,
      input
    )
    return response.data
  },

  async createSecretAccessRequest(
    projectId: string,
    secretId: string
  ): Promise<{ requested: true }> {
    const response = await apiClient.post<{ requested: true }>(
      `/v1/projects/${projectId}/secrets/${secretId}/access-requests`
    )
    return response.data
  },
}
