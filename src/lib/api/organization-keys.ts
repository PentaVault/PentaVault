import { apiClient } from '@/lib/api/client'
import {
  createOrganizationEncryptionKeyInputSchema,
  organizationEncryptionKeyResponseSchema,
  organizationEncryptionKeysResponseSchema,
  organizationKeyRewrapResponseSchema,
  parseApiInput,
  parseApiResponse,
} from '@/lib/api/schemas'
import type {
  CreateOrganizationEncryptionKeyInput,
  OrganizationEncryptionKeyResponse,
  OrganizationEncryptionKeysResponse,
  OrganizationKeyRewrapResponse,
} from '@/lib/types/api'

export const organizationKeysApi = {
  async list(): Promise<OrganizationEncryptionKeysResponse> {
    const response = await apiClient.get<OrganizationEncryptionKeysResponse>(
      '/v1/organizations/encryption-keys'
    )
    return parseApiResponse(organizationEncryptionKeysResponseSchema, response.data)
  },

  async adopt(
    input: CreateOrganizationEncryptionKeyInput
  ): Promise<OrganizationEncryptionKeyResponse> {
    const response = await apiClient.post<OrganizationEncryptionKeyResponse>(
      '/v1/organizations/encryption-keys',
      parseApiInput(createOrganizationEncryptionKeyInputSchema, input)
    )
    return parseApiResponse(organizationEncryptionKeyResponseSchema, response.data)
  },

  /**
   * Moves existing secrets onto the key. Safe to re-run — records already on
   * the key are skipped rather than rewritten.
   */
  async rewrap(keyId: string): Promise<OrganizationKeyRewrapResponse> {
    const response = await apiClient.post<OrganizationKeyRewrapResponse>(
      `/v1/organizations/encryption-keys/${keyId}/rewrap`
    )
    return parseApiResponse(organizationKeyRewrapResponseSchema, response.data)
  },

  /**
   * There is deliberately no delete: removing a key would strand every secret
   * still sealed under it. Deactivating stops new wraps while keeping it
   * available for unwrapping.
   */
  async setActive(keyId: string, active: boolean): Promise<OrganizationEncryptionKeyResponse> {
    const response = await apiClient.patch<OrganizationEncryptionKeyResponse>(
      `/v1/organizations/encryption-keys/${keyId}`,
      { active }
    )
    return parseApiResponse(organizationEncryptionKeyResponseSchema, response.data)
  },
}
