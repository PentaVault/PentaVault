import { apiClient } from '@/lib/api/client'
import {
  batchIssueTokensResponseSchema,
  issueTokenResponseSchema,
  parseApiResponse,
  projectTokensResponseSchema,
  resolveBulkResponseSchema,
  revokeTokenResponseSchema,
} from '@/lib/api/schemas'
import type {
  BatchIssueTokensInput,
  BatchIssueTokensResponse,
  IssueTokenInput,
  IssueTokenResponse,
  ProjectTokensResponse,
  ResolveBulkInput,
  ResolveBulkResponse,
  RevokeTokenInput,
  RevokeTokenResponse,
} from '@/lib/types/api'

export const tokensApi = {
  async listProjectTokens(projectId: string): Promise<ProjectTokensResponse> {
    const response = await apiClient.get<ProjectTokensResponse>(`/v1/projects/${projectId}/tokens`)
    return parseApiResponse(projectTokensResponseSchema, response.data)
  },

  async issueToken(input: IssueTokenInput): Promise<IssueTokenResponse> {
    const response = await apiClient.post<IssueTokenResponse>('/v1/tokens', input)
    return parseApiResponse(issueTokenResponseSchema, response.data)
  },

  async batchIssueTokens(input: BatchIssueTokensInput): Promise<BatchIssueTokensResponse> {
    const response = await apiClient.post<BatchIssueTokensResponse>(
      `/v1/projects/${input.projectId}/tokens/batch-issue`,
      {
        secretIds: input.secretIds,
        ...(input.userId ? { userId: input.userId } : {}),
      }
    )
    return parseApiResponse(batchIssueTokensResponseSchema, response.data)
  },

  async resolveBulk(input: ResolveBulkInput): Promise<ResolveBulkResponse> {
    const response = await apiClient.post<ResolveBulkResponse>('/v1/resolve-bulk', input)
    return parseApiResponse(resolveBulkResponseSchema, response.data)
  },

  async revokeToken(input: RevokeTokenInput): Promise<RevokeTokenResponse> {
    const response = await apiClient.post<RevokeTokenResponse>('/v1/tokens/revoke', input)
    return parseApiResponse(revokeTokenResponseSchema, response.data)
  },
}
