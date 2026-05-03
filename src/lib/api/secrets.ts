import { apiClient } from '@/lib/api/client'
import {
  approvePromotionRequestResponseSchema,
  createSecretResponseSchema,
  deleteSecretResponseSchema,
  importSecretsResponseSchema,
  parseApiResponse,
  projectSecretAccessResponseSchema,
  projectSecretsResponseSchema,
  promotionRequestResponseSchema,
  promotionRequestsResponseSchema,
  rejectSecretAccessRequestResponseSchema,
  revokeSecretAccessResponseSchema,
  secretAccessResponseSchema,
  updateSecretResponseSchema,
} from '@/lib/api/schemas'
import type {
  ApprovePromotionRequestResponse,
  CreatePersonalSecretInput,
  CreateSecretInput,
  CreateSecretResponse,
  GrantSecretAccessInput,
  ImportSecretsInput,
  ImportSecretsResponse,
  PersonalSecretsResponse,
  ProjectSecretAccessResponse,
  ProjectSecretsResponse,
  PromotePersonalSecretInput,
  PromotionRequestResponse,
  PromotionRequestsResponse,
  RejectSecretAccessRequestResponse,
  RevokeSecretAccessResponse,
  SecretAccessResponse,
  UpdateSecretInput,
  UpdateSecretResponse,
} from '@/lib/types/api'

export const secretsApi = {
  async listProjectSecrets(projectId: string): Promise<ProjectSecretsResponse> {
    const response = await apiClient.get<ProjectSecretsResponse>(
      `/v1/projects/${projectId}/secrets`
    )
    return parseApiResponse(projectSecretsResponseSchema, response.data)
  },

  async listPersonalSecrets(projectId: string): Promise<PersonalSecretsResponse> {
    const response = await apiClient.get<PersonalSecretsResponse>(
      `/v1/projects/${projectId}/personal-secrets`
    )
    return parseApiResponse(projectSecretsResponseSchema, response.data)
  },

  async listProjectSecretAccess(projectId: string): Promise<ProjectSecretAccessResponse> {
    const response = await apiClient.get<ProjectSecretAccessResponse>(
      `/v1/projects/${projectId}/secret-access`
    )
    return parseApiResponse(projectSecretAccessResponseSchema, response.data)
  },

  async listSecretAccess(input: {
    projectId: string
    secretId: string
  }): Promise<ProjectSecretAccessResponse> {
    const response = await apiClient.get<ProjectSecretAccessResponse>(
      `/v1/projects/${input.projectId}/secrets/${input.secretId}/access`
    )
    return parseApiResponse(projectSecretAccessResponseSchema, response.data)
  },

  async createSecret(input: CreateSecretInput): Promise<CreateSecretResponse> {
    const response = await apiClient.post<CreateSecretResponse>('/v1/secrets', input)
    return parseApiResponse(createSecretResponseSchema, response.data)
  },

  async createPersonalSecret(input: CreatePersonalSecretInput): Promise<CreateSecretResponse> {
    const response = await apiClient.post<CreateSecretResponse>(
      `/v1/projects/${input.projectId}/personal-secrets`,
      {
        environment: input.environment ?? 'development',
        environmentId: input.environmentId,
        name: input.name,
        plaintext: input.plaintext,
        mode: input.mode,
        encryptionMode: input.encryptionMode,
        isSensitive: input.isSensitive,
      }
    )
    return parseApiResponse(createSecretResponseSchema, response.data)
  },

  async importSecrets(input: ImportSecretsInput): Promise<ImportSecretsResponse> {
    const response = await apiClient.post<ImportSecretsResponse>('/v1/secrets/import', input)
    return parseApiResponse(importSecretsResponseSchema, response.data)
  },

  async updateSecret(input: UpdateSecretInput): Promise<UpdateSecretResponse> {
    const response = await apiClient.patch<UpdateSecretResponse>(
      `/v1/projects/${input.projectId}/secrets/${input.secretId}`,
      {
        plaintext: input.plaintext,
      }
    )
    return parseApiResponse(updateSecretResponseSchema, response.data)
  },

  async deleteSecret(input: {
    projectId: string
    secretId: string
  }): Promise<{ deleted: boolean; alreadyDeleted?: boolean; revokedTokenCount?: number }> {
    const response = await apiClient.delete<{
      deleted: boolean
      alreadyDeleted?: boolean
      revokedTokenCount?: number
    }>(`/v1/projects/${input.projectId}/secrets/${input.secretId}`)
    return parseApiResponse(deleteSecretResponseSchema, response.data)
  },

  async grantSecretAccess(input: GrantSecretAccessInput): Promise<SecretAccessResponse> {
    const response = await apiClient.post<SecretAccessResponse>(
      `/v1/projects/${input.projectId}/secrets/${input.secretId}/access`,
      {
        userId: input.userId,
        environmentId: input.environmentId,
      }
    )
    return parseApiResponse(secretAccessResponseSchema, response.data)
  },

  async revokeSecretAccess(input: {
    projectId: string
    secretId: string
    userId: string
  }): Promise<RevokeSecretAccessResponse> {
    const response = await apiClient.delete<RevokeSecretAccessResponse>(
      `/v1/projects/${input.projectId}/secrets/${input.secretId}/access/${input.userId}`
    )
    return parseApiResponse(revokeSecretAccessResponseSchema, response.data)
  },

  async rejectSecretAccessRequest(input: {
    projectId: string
    secretId: string
    userId: string
  }): Promise<RejectSecretAccessRequestResponse> {
    const response = await apiClient.post<RejectSecretAccessRequestResponse>(
      `/v1/projects/${input.projectId}/secrets/${input.secretId}/access-requests/${input.userId}/reject`
    )
    return parseApiResponse(rejectSecretAccessRequestResponseSchema, response.data)
  },

  async listPromotionRequests(projectId: string): Promise<PromotionRequestsResponse> {
    const response = await apiClient.get<PromotionRequestsResponse>(
      `/v1/projects/${projectId}/personal-secret-promotion-requests`
    )
    return parseApiResponse(promotionRequestsResponseSchema, response.data)
  },

  async promotePersonalSecret(
    input: PromotePersonalSecretInput
  ): Promise<PromotionRequestResponse> {
    const response = await apiClient.post<PromotionRequestResponse>(
      `/v1/projects/${input.projectId}/personal-secrets/${input.secretId}/promote`,
      {
        targetName: input.targetName,
        targetEnvironment: input.targetEnvironment,
        targetEnvironmentId: input.targetEnvironmentId,
      }
    )
    return parseApiResponse(promotionRequestResponseSchema, response.data)
  },

  async approvePromotionRequest(input: {
    projectId: string
    requestId: string
    reviewerNote?: string | null
  }): Promise<ApprovePromotionRequestResponse> {
    const response = await apiClient.post<ApprovePromotionRequestResponse>(
      `/v1/projects/${input.projectId}/personal-secret-promotion-requests/${input.requestId}/approve`,
      { reviewerNote: input.reviewerNote }
    )
    return parseApiResponse(approvePromotionRequestResponseSchema, response.data)
  },

  async rejectPromotionRequest(input: {
    projectId: string
    requestId: string
    reviewerNote?: string | null
  }): Promise<PromotionRequestResponse> {
    const response = await apiClient.post<PromotionRequestResponse>(
      `/v1/projects/${input.projectId}/personal-secret-promotion-requests/${input.requestId}/reject`,
      { reviewerNote: input.reviewerNote }
    )
    return parseApiResponse(promotionRequestResponseSchema, response.data)
  },
}
