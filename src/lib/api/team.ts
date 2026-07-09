import { z } from 'zod'
import { authApi } from '@/lib/api/auth'
import { apiClient } from '@/lib/api/client'
import {
  authOrganizationMemberSchema,
  parseApiResponse,
  projectMemberEnvironmentAccessResponseSchema,
  projectMembershipResponseSchema,
  projectMembersResponseSchema,
  removeProjectMemberResponseSchema,
  replaceProjectMemberEnvironmentAccessInputSchema,
} from '@/lib/api/schemas'
import type {
  CreateProjectMemberInput,
  ProjectMemberEnvironmentAccessResponse,
  ProjectMembershipResponse,
  ProjectMembersResponse,
  RemoveProjectMemberResponse,
  ReplaceProjectMemberEnvironmentAccessInput,
  UpdateProjectMemberInput,
} from '@/lib/types/api'
import type { AuthOrganizationMember, OrgRole } from '@/lib/types/auth'
import { getApiErrorCode } from '@/lib/utils/errors'

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
    return parseApiResponse(z.object({ member: authOrganizationMemberSchema }), response.data)
  },

  async removeOrganizationMember(
    organizationId: string,
    userId: string
  ): Promise<{ removed: true; userId: string }> {
    const response = await apiClient.delete<{ removed: true; userId: string }>(
      `/v1/organizations/${organizationId}/members/${userId}`
    )
    return parseApiResponse(
      z.object({ removed: z.literal(true), userId: z.string() }),
      response.data
    )
  },

  async listMembers(projectId: string): Promise<ProjectMembersResponse> {
    const response = await apiClient.get<ProjectMembersResponse>(
      `/v1/projects/${projectId}/members`
    )
    return parseApiResponse(projectMembersResponseSchema, response.data)
  },

  async addMember(
    projectId: string,
    input: CreateProjectMemberInput
  ): Promise<ProjectMembershipResponse> {
    const response = await apiClient.post<ProjectMembershipResponse>(
      `/v1/projects/${projectId}/members`,
      input
    )
    return parseApiResponse(projectMembershipResponseSchema, response.data)
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
    return parseApiResponse(projectMembershipResponseSchema, response.data)
  },

  async removeMember(projectId: string, userId: string): Promise<RemoveProjectMemberResponse> {
    const response = await apiClient.delete<RemoveProjectMemberResponse>(
      `/v1/projects/${projectId}/members/${userId}`
    )
    return parseApiResponse(removeProjectMemberResponseSchema, response.data)
  },

  async listMemberEnvironmentAccess(
    projectId: string,
    userId: string
  ): Promise<ProjectMemberEnvironmentAccessResponse> {
    try {
      const response = await apiClient.get<ProjectMemberEnvironmentAccessResponse>(
        `/v1/projects/${projectId}/members/${userId}/environments`
      )
      return parseApiResponse(projectMemberEnvironmentAccessResponseSchema, response.data)
    } catch (error) {
      if (getApiErrorCode(error) === 'ROUTE_NOT_FOUND') {
        return { access: [], unavailable: true }
      }

      throw error
    }
  },

  async replaceMemberEnvironmentAccess(
    projectId: string,
    userId: string,
    input: ReplaceProjectMemberEnvironmentAccessInput
  ): Promise<ProjectMemberEnvironmentAccessResponse> {
    const response = await apiClient.put<ProjectMemberEnvironmentAccessResponse>(
      `/v1/projects/${projectId}/members/${userId}/environments`,
      replaceProjectMemberEnvironmentAccessInputSchema.parse(input)
    )
    return parseApiResponse(projectMemberEnvironmentAccessResponseSchema, response.data)
  },
}
