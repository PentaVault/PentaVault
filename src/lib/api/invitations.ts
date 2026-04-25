import { apiClient } from '@/lib/api/client'
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
      input
    )
    return response.data
  },

  async list(organizationId: string): Promise<{ invitations: OrgInvitation[] }> {
    const response = await apiClient.get<{ invitations: OrgInvitation[] }>(
      `/v1/organizations/${organizationId}/invitations`
    )
    return response.data
  },

  async revoke(organizationId: string, invitationId: string): Promise<OrgInvitationResponse> {
    const response = await apiClient.delete<OrgInvitationResponse>(
      `/v1/organizations/${organizationId}/invitations/${invitationId}`
    )
    return response.data
  },

  async resend(organizationId: string, invitationId: string): Promise<OrgInvitationResponse> {
    const response = await apiClient.post<OrgInvitationResponse>(
      `/v1/organizations/${organizationId}/invitations/${invitationId}/resend`
    )
    return response.data
  },

  async verify(token: string): Promise<VerifyInvitationResponse> {
    const response = await apiClient.get<VerifyInvitationResponse>(
      `/v1/invitations/${encodeURIComponent(token)}/verify`
    )
    return response.data
  },

  async accept(token: string): Promise<OrgInvitationResponse> {
    const response = await apiClient.post<OrgInvitationResponse>(
      `/v1/invitations/${encodeURIComponent(token)}/accept`
    )
    return response.data
  },

  async acceptById(invitationId: string): Promise<OrgInvitationResponse> {
    const response = await apiClient.post<OrgInvitationResponse>(
      `/v1/invitations/by-id/${encodeURIComponent(invitationId)}/accept`,
      {}
    )
    return response.data
  },

  async reject(token: string): Promise<OrgInvitationResponse> {
    const response = await apiClient.post<OrgInvitationResponse>(
      `/v1/invitations/${encodeURIComponent(token)}/reject`
    )
    return response.data
  },

  async rejectById(invitationId: string): Promise<OrgInvitationResponse> {
    const response = await apiClient.post<OrgInvitationResponse>(
      `/v1/invitations/by-id/${encodeURIComponent(invitationId)}/reject`,
      {}
    )
    return response.data
  },
}
