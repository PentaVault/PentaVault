import { apiClient } from '@/lib/api/client'
import {
  machineIdentitiesResponseSchema,
  machineIdentityAuthMethodResponseSchema,
  machineIdentityAuthMethodsResponseSchema,
  machineIdentityProjectGrantResponseSchema,
  machineIdentityProjectGrantsResponseSchema,
  machineIdentityResponseSchema,
  parseApiResponse,
} from '@/lib/api/schemas'
import type {
  CreateMachineIdentityAuthMethodInput,
  CreateMachineIdentityInput,
  MachineIdentitiesResponse,
  MachineIdentity,
  MachineIdentityAuthMethod,
  MachineIdentityAuthMethodsResponse,
  MachineIdentityGrantRole,
  MachineIdentityProjectGrant,
  MachineIdentityProjectGrantsResponse,
  UpdateMachineIdentityInput,
} from '@/lib/types/api'

export const machineIdentitiesApi = {
  async list(): Promise<MachineIdentitiesResponse> {
    const response = await apiClient.get<MachineIdentitiesResponse>('/v1/identities')
    return parseApiResponse(machineIdentitiesResponseSchema, response.data)
  },

  async create(input: CreateMachineIdentityInput): Promise<MachineIdentity> {
    const response = await apiClient.post('/v1/identities', input)
    return parseApiResponse<{ identity: MachineIdentity }>(
      machineIdentityResponseSchema,
      response.data
    ).identity
  },

  async update(identityId: string, input: UpdateMachineIdentityInput): Promise<MachineIdentity> {
    const response = await apiClient.patch(`/v1/identities/${identityId}`, input)
    return parseApiResponse<{ identity: MachineIdentity }>(
      machineIdentityResponseSchema,
      response.data
    ).identity
  },

  async remove(identityId: string): Promise<void> {
    await apiClient.delete(`/v1/identities/${identityId}`)
  },

  async listAuthMethods(identityId: string): Promise<MachineIdentityAuthMethodsResponse> {
    const response = await apiClient.get(`/v1/identities/${identityId}/auth-methods`)
    return parseApiResponse(machineIdentityAuthMethodsResponseSchema, response.data)
  },

  async createAuthMethod(
    identityId: string,
    input: CreateMachineIdentityAuthMethodInput
  ): Promise<MachineIdentityAuthMethod> {
    const response = await apiClient.post(`/v1/identities/${identityId}/auth-methods`, input)
    return parseApiResponse<{ authMethod: MachineIdentityAuthMethod }>(
      machineIdentityAuthMethodResponseSchema,
      response.data
    ).authMethod
  },

  async setAuthMethodEnabled(
    identityId: string,
    authMethodId: string,
    enabled: boolean
  ): Promise<MachineIdentityAuthMethod> {
    const response = await apiClient.patch(
      `/v1/identities/${identityId}/auth-methods/${authMethodId}`,
      { enabled }
    )
    return parseApiResponse<{ authMethod: MachineIdentityAuthMethod }>(
      machineIdentityAuthMethodResponseSchema,
      response.data
    ).authMethod
  },

  async removeAuthMethod(identityId: string, authMethodId: string): Promise<void> {
    await apiClient.delete(`/v1/identities/${identityId}/auth-methods/${authMethodId}`)
  },

  async listProjectGrants(identityId: string): Promise<MachineIdentityProjectGrantsResponse> {
    const response = await apiClient.get(`/v1/identities/${identityId}/project-grants`)
    return parseApiResponse(machineIdentityProjectGrantsResponseSchema, response.data)
  },

  async grantProject(
    identityId: string,
    projectId: string,
    role: MachineIdentityGrantRole
  ): Promise<MachineIdentityProjectGrant> {
    const response = await apiClient.put(
      `/v1/identities/${identityId}/project-grants/${projectId}`,
      { role }
    )
    return parseApiResponse<{ grant: MachineIdentityProjectGrant }>(
      machineIdentityProjectGrantResponseSchema,
      response.data
    ).grant
  },

  async revokeProject(identityId: string, projectId: string): Promise<void> {
    await apiClient.delete(`/v1/identities/${identityId}/project-grants/${projectId}`)
  },
}
