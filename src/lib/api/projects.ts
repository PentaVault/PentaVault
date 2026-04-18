import { apiClient } from '@/lib/api/client'
import type {
  CreateProjectInput,
  ListProjectsResponse,
  ProjectMembersResponse,
  ProjectResponse,
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

  async listMembers(projectId: string): Promise<ProjectMembersResponse> {
    const response = await apiClient.get<ProjectMembersResponse>(
      `/v1/projects/${projectId}/members`
    )
    return response.data
  },
}
