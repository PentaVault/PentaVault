import { authApi } from '@/lib/api/auth'
import { apiClient } from '@/lib/api/client'
import type {
  CreateProjectMemberInput,
  ProjectMembershipResponse,
  ProjectMembersResponse,
  RemoveProjectMemberResponse,
  UpdateProjectMemberInput,
} from '@/lib/types/api'
import type { AuthOrganizationMember, OrgRole } from '@/lib/types/auth'

export const teamApi = {
  async listOrganizationMembers(organizationId: string) {
    return authApi.listOrganizationMembers(organizationId)
  },

  async updateOrganizationMember(
    organizationId: string,
    userId: string,
    input: { role: OrgRole }
  ): Promise<{ member: AuthOrganizationMember }> {
    const response = await apiClient.patch<{ member: AuthOrganizationMember }>(
      `/v1/organizations/${organizationId}/members/${userId}`,
      input
    )
    return response.data
  },

  async removeOrganizationMember(
    organizationId: string,
    userId: string
  ): Promise<{ removed: true; userId: string }> {
    const response = await apiClient.delete<{ removed: true; userId: string }>(
      `/v1/organizations/${organizationId}/members/${userId}`
    )
    return response.data
  },

  async listMembers(projectId: string): Promise<ProjectMembersResponse> {
    const response = await apiClient.get<ProjectMembersResponse>(
      `/v1/projects/${projectId}/members`
    )
    return response.data
  },

  async addMember(
    projectId: string,
    input: CreateProjectMemberInput
  ): Promise<ProjectMembershipResponse> {
    const response = await apiClient.post<ProjectMembershipResponse>(
      `/v1/projects/${projectId}/members`,
      input
    )
    return response.data
  },

  async updateMember(
    projectId: string,
    userId: string,
    input: UpdateProjectMemberInput
  ): Promise<ProjectMembershipResponse> {
    const response = await apiClient.patch<ProjectMembershipResponse>(
      `/v1/projects/${projectId}/members/${userId}`,
      input
    )
    return response.data
  },

  async removeMember(projectId: string, userId: string): Promise<RemoveProjectMemberResponse> {
    const response = await apiClient.delete<RemoveProjectMemberResponse>(
      `/v1/projects/${projectId}/members/${userId}`
    )
    return response.data
  },
}
