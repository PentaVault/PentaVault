import { apiClient } from '@/lib/api/client'
import {
  createSsoConnectionInputSchema,
  parseApiInput,
  parseApiResponse,
  ssoConnectionResponseSchema,
  ssoConnectionsResponseSchema,
  ssoDiscoveryResponseSchema,
  ssoVerificationResponseSchema,
  updateSsoConnectionInputSchema,
} from '@/lib/api/schemas'
import type {
  CreateSsoConnectionInput,
  SsoConnectionResponse,
  SsoConnectionsResponse,
  SsoDiscoveryResponse,
  SsoVerificationResponse,
  UpdateSsoConnectionInput,
} from '@/lib/types/api'

export const ssoApi = {
  /**
   * Finds which SSO connection an address belongs to. Called from the login
   * page, so it is unauthenticated and returns only an id and a label.
   */
  async discover(email: string): Promise<SsoDiscoveryResponse> {
    const response = await apiClient.post<SsoDiscoveryResponse>('/v1/sso/discover', { email })
    return parseApiResponse(ssoDiscoveryResponseSchema, response.data)
  },

  async list(): Promise<SsoConnectionsResponse> {
    const response = await apiClient.get<SsoConnectionsResponse>('/v1/sso/connections')
    return parseApiResponse(ssoConnectionsResponseSchema, response.data)
  },

  async create(input: CreateSsoConnectionInput): Promise<SsoConnectionResponse> {
    const response = await apiClient.post<SsoConnectionResponse>(
      '/v1/sso/connections',
      parseApiInput(createSsoConnectionInputSchema, input)
    )
    return parseApiResponse(ssoConnectionResponseSchema, response.data)
  },

  async update(
    connectionId: string,
    input: UpdateSsoConnectionInput
  ): Promise<SsoConnectionResponse> {
    const response = await apiClient.patch<SsoConnectionResponse>(
      `/v1/sso/connections/${connectionId}`,
      parseApiInput(updateSsoConnectionInputSchema, input)
    )
    return parseApiResponse(ssoConnectionResponseSchema, response.data)
  },

  async remove(connectionId: string): Promise<void> {
    await apiClient.delete(`/v1/sso/connections/${connectionId}`)
  },

  /**
   * Checks a real ID token against the connection. Returns a decision only —
   * no session is created and no credential is issued.
   */
  async verify(
    connectionId: string,
    input: { idToken: string; nonce: string }
  ): Promise<SsoVerificationResponse> {
    const response = await apiClient.post<SsoVerificationResponse>(
      `/v1/sso/connections/${connectionId}/verify`,
      input
    )
    return parseApiResponse(ssoVerificationResponseSchema, response.data)
  },
}
