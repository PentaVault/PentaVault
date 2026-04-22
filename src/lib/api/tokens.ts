import { apiClient } from '@/lib/api/client'
import type {
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
    return response.data
  },

  async issueToken(input: IssueTokenInput): Promise<IssueTokenResponse> {
    const response = await apiClient.post<IssueTokenResponse>('/v1/tokens', input)
    return response.data
  },

  async resolveBulk(input: ResolveBulkInput): Promise<ResolveBulkResponse> {
    const response = await apiClient.post<ResolveBulkResponse>('/v1/resolve-bulk', input)
    return response.data
  },

  async revokeToken(input: RevokeTokenInput): Promise<RevokeTokenResponse> {
    const response = await apiClient.post<RevokeTokenResponse>('/v1/tokens/revoke', input)
    return response.data
  },
}
