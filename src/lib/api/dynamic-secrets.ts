import { apiClient } from '@/lib/api/client'
import {
  createDynamicSecretInputSchema,
  dynamicSecretLeaseResponseSchema,
  dynamicSecretLeasesResponseSchema,
  dynamicSecretResponseSchema,
  dynamicSecretsResponseSchema,
  issueDynamicSecretLeaseInputSchema,
  issueDynamicSecretLeaseResponseSchema,
  parseApiInput,
  parseApiResponse,
  updateDynamicSecretInputSchema,
} from '@/lib/api/schemas'
import type {
  CreateDynamicSecretInput,
  DynamicSecretLeaseResponse,
  DynamicSecretLeasesResponse,
  DynamicSecretResponse,
  DynamicSecretsResponse,
  IssueDynamicSecretLeaseInput,
  IssueDynamicSecretLeaseResponse,
  UpdateDynamicSecretInput,
} from '@/lib/types/api'

export const dynamicSecretsApi = {
  async list(projectId: string): Promise<DynamicSecretsResponse> {
    const response = await apiClient.get<DynamicSecretsResponse>(
      `/v1/projects/${projectId}/dynamic-secrets`
    )
    return parseApiResponse(dynamicSecretsResponseSchema, response.data)
  },

  async create(projectId: string, input: CreateDynamicSecretInput): Promise<DynamicSecretResponse> {
    const response = await apiClient.post<DynamicSecretResponse>(
      `/v1/projects/${projectId}/dynamic-secrets`,
      parseApiInput(createDynamicSecretInputSchema, input)
    )
    return parseApiResponse(dynamicSecretResponseSchema, response.data)
  },

  async update(
    projectId: string,
    dynamicSecretId: string,
    input: UpdateDynamicSecretInput
  ): Promise<DynamicSecretResponse> {
    const response = await apiClient.patch<DynamicSecretResponse>(
      `/v1/projects/${projectId}/dynamic-secrets/${dynamicSecretId}`,
      parseApiInput(updateDynamicSecretInputSchema, input)
    )
    return parseApiResponse(dynamicSecretResponseSchema, response.data)
  },

  async remove(projectId: string, dynamicSecretId: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete<{ deleted: boolean }>(
      `/v1/projects/${projectId}/dynamic-secrets/${dynamicSecretId}`
    )
    return response.data
  },

  async listLeases(
    projectId: string,
    dynamicSecretId: string
  ): Promise<DynamicSecretLeasesResponse> {
    const response = await apiClient.get<DynamicSecretLeasesResponse>(
      `/v1/projects/${projectId}/dynamic-secrets/${dynamicSecretId}/leases`
    )
    return parseApiResponse(dynamicSecretLeasesResponseSchema, response.data)
  },

  async issueLease(
    projectId: string,
    dynamicSecretId: string,
    input: IssueDynamicSecretLeaseInput = {}
  ): Promise<IssueDynamicSecretLeaseResponse> {
    const response = await apiClient.post<IssueDynamicSecretLeaseResponse>(
      `/v1/projects/${projectId}/dynamic-secrets/${dynamicSecretId}/leases`,
      parseApiInput(issueDynamicSecretLeaseInputSchema, input)
    )
    return parseApiResponse(issueDynamicSecretLeaseResponseSchema, response.data)
  },

  async revokeLease(projectId: string, leaseId: string): Promise<DynamicSecretLeaseResponse> {
    const response = await apiClient.post<DynamicSecretLeaseResponse>(
      `/v1/projects/${projectId}/dynamic-secret-leases/${leaseId}/revoke`
    )
    return parseApiResponse(dynamicSecretLeaseResponseSchema, response.data)
  },
}
