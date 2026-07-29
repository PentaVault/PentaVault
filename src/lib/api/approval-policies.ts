import { apiClient } from '@/lib/api/client'
import {
  approvalPoliciesResponseSchema,
  approvalPolicyResponseSchema,
  createApprovalPolicyInputSchema,
  parseApiInput,
  parseApiResponse,
  updateApprovalPolicyInputSchema,
} from '@/lib/api/schemas'
import type {
  ApprovalPoliciesResponse,
  ApprovalPolicyResponse,
  CreateApprovalPolicyInput,
  UpdateApprovalPolicyInput,
} from '@/lib/types/api'

export const approvalPoliciesApi = {
  async list(projectId: string): Promise<ApprovalPoliciesResponse> {
    const response = await apiClient.get<ApprovalPoliciesResponse>(
      `/v1/projects/${projectId}/approval-policies`
    )
    return parseApiResponse(approvalPoliciesResponseSchema, response.data)
  },

  async create(
    projectId: string,
    input: CreateApprovalPolicyInput
  ): Promise<ApprovalPolicyResponse> {
    const response = await apiClient.post<ApprovalPolicyResponse>(
      `/v1/projects/${projectId}/approval-policies`,
      parseApiInput(createApprovalPolicyInputSchema, input)
    )
    return parseApiResponse(approvalPolicyResponseSchema, response.data)
  },

  async update(
    projectId: string,
    policyId: string,
    input: UpdateApprovalPolicyInput
  ): Promise<ApprovalPolicyResponse> {
    const response = await apiClient.patch<ApprovalPolicyResponse>(
      `/v1/projects/${projectId}/approval-policies/${policyId}`,
      parseApiInput(updateApprovalPolicyInputSchema, input)
    )
    return parseApiResponse(approvalPolicyResponseSchema, response.data)
  },

  async remove(projectId: string, policyId: string): Promise<void> {
    await apiClient.delete(`/v1/projects/${projectId}/approval-policies/${policyId}`)
  },
}
