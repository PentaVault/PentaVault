import { apiClient } from '@/lib/api/client'
import {
  createTrustedIpRuleInputSchema,
  organizationNetworkPolicyResponseSchema,
  parseApiInput,
  parseApiResponse,
  trustedIpRuleResponseSchema,
} from '@/lib/api/schemas'
import type {
  CreateTrustedIpRuleInput,
  NetworkPolicyMode,
  OrganizationNetworkPolicyResponse,
  TrustedIpRuleResponse,
  UpdateTrustedIpRuleInput,
} from '@/lib/types/api'

function basePath(organizationId: string) {
  return `/v1/organizations/${organizationId}/network-policy`
}

export const networkPolicyApi = {
  async get(organizationId: string): Promise<OrganizationNetworkPolicyResponse> {
    const response = await apiClient.get<OrganizationNetworkPolicyResponse>(
      basePath(organizationId)
    )
    return parseApiResponse(organizationNetworkPolicyResponseSchema, response.data)
  },

  async setMode(
    organizationId: string,
    mode: NetworkPolicyMode
  ): Promise<OrganizationNetworkPolicyResponse> {
    const response = await apiClient.patch<OrganizationNetworkPolicyResponse>(
      basePath(organizationId),
      { mode }
    )
    return parseApiResponse(organizationNetworkPolicyResponseSchema, response.data)
  },

  async addRule(
    organizationId: string,
    input: CreateTrustedIpRuleInput
  ): Promise<TrustedIpRuleResponse> {
    const response = await apiClient.post<TrustedIpRuleResponse>(
      `${basePath(organizationId)}/trusted-ips`,
      parseApiInput(createTrustedIpRuleInputSchema, input)
    )
    return parseApiResponse(trustedIpRuleResponseSchema, response.data)
  },

  async updateRule(
    organizationId: string,
    ruleId: string,
    input: UpdateTrustedIpRuleInput
  ): Promise<TrustedIpRuleResponse> {
    const response = await apiClient.patch<TrustedIpRuleResponse>(
      `${basePath(organizationId)}/trusted-ips/${ruleId}`,
      input
    )
    return parseApiResponse(trustedIpRuleResponseSchema, response.data)
  },

  async removeRule(organizationId: string, ruleId: string): Promise<void> {
    await apiClient.delete(`${basePath(organizationId)}/trusted-ips/${ruleId}`)
  },
}
