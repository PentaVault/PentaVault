import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import {
  orgInvitationResponseSchema,
  orgInvitationSchema,
  parseApiInput,
  parseApiResponse,
  sendOrgInvitationInputSchema,
  verifyInvitationResponseSchema,
} from '@/lib/api/schemas'
import type {
  OrgInvitationResponse,
  SendOrgInvitationInput,
  VerifyInvitationResponse,
} from '@/lib/types/api'
import type { OrgInvitation } from '@/lib/types/auth'

export const invitationsApi = {
  async send(
    organizationId: string,
    input: SendOrgInvitationInput
  ): Promise<OrgInvitationResponse> {
    const response = await apiClient.post<OrgInvitationResponse>(
      `/v1/organizations/${organizationId}/invitations`,
      parseApiInput(sendOrgInvitationInputSchema, input)
    )
    return parseApiResponse(orgInvitationResponseSchema, response.data)
  },

  async list(organizationId: string): Promise<{ invitations: OrgInvitation[] }> {
    const response = await apiClient.get<{ invitations: OrgInvitation[] }>(
      `/v1/organizations/${organizationId}/invitations`
    )
    return parseApiResponse(z.object({ invitations: z.array(orgInvitationSchema) }), response.data)
  },

  async revoke(organizationId: string, invitationId: string): Promise<OrgInvitationResponse> {
    const response = await apiClient.delete<OrgInvitationResponse>(
      `/v1/organizations/${organizationId}/invitations/${invitationId}`
    )
    return parseApiResponse(orgInvitationResponseSchema, response.data)
  },

  async resend(organizationId: string, invitationId: string): Promise<OrgInvitationResponse> {
    const response = await apiClient.post<OrgInvitationResponse>(
      `/v1/organizations/${organizationId}/invitations/${invitationId}/resend`
    )
    return parseApiResponse(orgInvitationResponseSchema, response.data)
  },

  async verify(token: string): Promise<VerifyInvitationResponse> {
    const response = await apiClient.get<VerifyInvitationResponse>(
      `/v1/invitations/${encodeURIComponent(token)}/verify`
    )
    return parseApiResponse(verifyInvitationResponseSchema, response.data)
  },

  async accept(token: string): Promise<OrgInvitationResponse> {
    const response = await apiClient.post<OrgInvitationResponse>(
      `/v1/invitations/${encodeURIComponent(token)}/accept`
    )
    return parseApiResponse(orgInvitationResponseSchema, response.data)
  },

  async acceptById(invitationId: string): Promise<OrgInvitationResponse> {
    const response = await apiClient.post<OrgInvitationResponse>(
      `/v1/invitations/by-id/${encodeURIComponent(invitationId)}/accept`,
      {}
    )
    return parseApiResponse(orgInvitationResponseSchema, response.data)
  },

  async reject(token: string): Promise<OrgInvitationResponse> {
    const response = await apiClient.post<OrgInvitationResponse>(
      `/v1/invitations/${encodeURIComponent(token)}/reject`
    )
    return parseApiResponse(orgInvitationResponseSchema, response.data)
  },

  async rejectById(invitationId: string): Promise<OrgInvitationResponse> {
    const response = await apiClient.post<OrgInvitationResponse>(
      `/v1/invitations/by-id/${encodeURIComponent(invitationId)}/reject`,
      {}
    )
    return parseApiResponse(orgInvitationResponseSchema, response.data)
  },
}
