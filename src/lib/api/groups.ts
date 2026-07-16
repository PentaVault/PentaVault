import { z } from 'zod'

import { apiClient } from '@/lib/api/client'
import {
  accessGroupMembersResponseSchema,
  accessGroupResponseSchema,
  accessGroupsResponseSchema,
  createAccessGroupInputSchema,
  grantProjectAccessGroupInputSchema,
  parseApiInput,
  parseApiResponse,
  projectAccessGroupGrantResponseSchema,
  projectAccessGroupsResponseSchema,
  updateAccessGroupInputSchema,
} from '@/lib/api/schemas'
import type {
  AccessGroupMembersResponse,
  AccessGroupResponse,
  AccessGroupsResponse,
  CreateAccessGroupInput,
  GrantProjectAccessGroupInput,
  ProjectAccessGroupGrantResponse,
  ProjectAccessGroupsResponse,
  UpdateAccessGroupInput,
} from '@/lib/types/api'

export const groupsApi = {
  async list(organizationId: string): Promise<AccessGroupsResponse> {
    const response = await apiClient.get(`/v1/organizations/${organizationId}/access-groups`)
    return parseApiResponse(accessGroupsResponseSchema, response.data)
  },
  async create(
    organizationId: string,
    input: CreateAccessGroupInput
  ): Promise<AccessGroupResponse> {
    const response = await apiClient.post(
      `/v1/organizations/${organizationId}/access-groups`,
      parseApiInput(createAccessGroupInputSchema, input)
    )
    return parseApiResponse(accessGroupResponseSchema, response.data)
  },
  async update(
    organizationId: string,
    groupId: string,
    input: UpdateAccessGroupInput
  ): Promise<AccessGroupResponse> {
    const response = await apiClient.patch(
      `/v1/organizations/${organizationId}/access-groups/${groupId}`,
      parseApiInput(updateAccessGroupInputSchema, input)
    )
    return parseApiResponse(accessGroupResponseSchema, response.data)
  },
  async remove(organizationId: string, groupId: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete(
      `/v1/organizations/${organizationId}/access-groups/${groupId}`
    )
    return parseApiResponse(z.object({ deleted: z.boolean() }), response.data)
  },
  async listMembers(organizationId: string, groupId: string): Promise<AccessGroupMembersResponse> {
    const response = await apiClient.get(
      `/v1/organizations/${organizationId}/access-groups/${groupId}/members`
    )
    return parseApiResponse(accessGroupMembersResponseSchema, response.data)
  },
  async addMember(
    organizationId: string,
    groupId: string,
    userId: string
  ): Promise<AccessGroupMembersResponse> {
    const response = await apiClient.post(
      `/v1/organizations/${organizationId}/access-groups/${groupId}/members`,
      { userId }
    )
    return parseApiResponse(accessGroupMembersResponseSchema, response.data)
  },
  async removeMember(
    organizationId: string,
    groupId: string,
    userId: string
  ): Promise<{ removed: boolean }> {
    const response = await apiClient.delete(
      `/v1/organizations/${organizationId}/access-groups/${groupId}/members/${userId}`
    )
    return parseApiResponse(z.object({ removed: z.boolean() }), response.data)
  },
  async listProject(projectId: string): Promise<ProjectAccessGroupsResponse> {
    const response = await apiClient.get(`/v1/projects/${projectId}/access-groups`)
    return parseApiResponse(projectAccessGroupsResponseSchema, response.data)
  },
  async grantProject(
    projectId: string,
    groupId: string,
    input: GrantProjectAccessGroupInput
  ): Promise<ProjectAccessGroupGrantResponse> {
    const response = await apiClient.put(
      `/v1/projects/${projectId}/access-groups/${groupId}`,
      parseApiInput(grantProjectAccessGroupInputSchema, input)
    )
    return parseApiResponse(projectAccessGroupGrantResponseSchema, response.data)
  },
  async revokeProject(projectId: string, groupId: string): Promise<{ revoked: boolean }> {
    const response = await apiClient.delete(`/v1/projects/${projectId}/access-groups/${groupId}`)
    return parseApiResponse(z.object({ revoked: z.boolean() }), response.data)
  },
}
