import { apiClient } from '@/lib/api/client'
import {
  createSecretValidationRuleInputSchema,
  parseApiInput,
  parseApiResponse,
  secretValidationRuleResponseSchema,
  secretValidationRulesResponseSchema,
  updateSecretValidationRuleInputSchema,
} from '@/lib/api/schemas'
import type {
  CreateSecretValidationRuleInput,
  SecretValidationRuleResponse,
  SecretValidationRulesResponse,
  UpdateSecretValidationRuleInput,
} from '@/lib/types/api'

export const secretValidationRulesApi = {
  async list(projectId: string): Promise<SecretValidationRulesResponse> {
    const response = await apiClient.get<SecretValidationRulesResponse>(
      `/v1/projects/${projectId}/secret-validation-rules`
    )
    return parseApiResponse(secretValidationRulesResponseSchema, response.data)
  },

  async create(
    projectId: string,
    input: CreateSecretValidationRuleInput
  ): Promise<SecretValidationRuleResponse> {
    const response = await apiClient.post<SecretValidationRuleResponse>(
      `/v1/projects/${projectId}/secret-validation-rules`,
      parseApiInput(createSecretValidationRuleInputSchema, input)
    )
    return parseApiResponse(secretValidationRuleResponseSchema, response.data)
  },

  async update(
    projectId: string,
    ruleId: string,
    input: UpdateSecretValidationRuleInput
  ): Promise<SecretValidationRuleResponse> {
    const response = await apiClient.patch<SecretValidationRuleResponse>(
      `/v1/projects/${projectId}/secret-validation-rules/${ruleId}`,
      parseApiInput(updateSecretValidationRuleInputSchema, input)
    )
    return parseApiResponse(secretValidationRuleResponseSchema, response.data)
  },

  async remove(projectId: string, ruleId: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete<{ deleted: boolean }>(
      `/v1/projects/${projectId}/secret-validation-rules/${ruleId}`
    )
    return response.data
  },
}
