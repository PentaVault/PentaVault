import axios from 'axios'
import { z } from 'zod'

import { apiClient } from '@/lib/api/client'
import {
  authOrganizationMembersResponseSchema,
  authOrganizationsResponseSchema,
  authSessionSchema,
  parseApiResponse,
} from '@/lib/api/schemas'
import { createMockSession, isMockAuthEnabled, isMockCredential } from '@/lib/auth/mock-auth'
import { clearClientAuthHint, hasAuthCookieHint, setClientAuthHint } from '@/lib/auth/token'
import { AUTH_REVOKE_SESSION_PATH, AUTH_SESSION_PATH, AUTH_SESSIONS_PATH } from '@/lib/constants'
import { env } from '@/lib/env'
import type {
  AuthChangePasswordInput,
  AuthCompleteMfaSetupInput,
  AuthCompleteRegistrationInput,
  AuthCreateApiKeyRequest,
  AuthCreateApiKeyResponse,
  AuthDisableMfaInput,
  AuthEnableMfaInput,
  AuthEnableMfaResponse,
  AuthRequestPasswordResetOtpInput,
  AuthResetPasswordWithOtpInput,
  AuthResetPasswordWithOtpResponse,
  AuthSessionListApiResponse,
  AuthSessionResponse,
  AuthSessionRevokeRequest,
  AuthSessionRevokeResponse,
  AuthSignInWithEmailInput,
  AuthSignInWithEmailResponse,
  AuthStartMfaChangeInput,
  AuthStartRecoveryMfaSetupInput,
  AuthStartRegistrationInput,
  AuthVerifyBackupCodeInput,
  AuthVerifyEmailOtpInput,
  AuthVerifyTotpInput,
} from '@/lib/types/api'
import type {
  AuthCreateOrganizationInput,
  AuthDeleteOrganizationInput,
  AuthOrganizationMembersResponse,
  AuthOrganizationsResponse,
  AuthSetActiveOrganizationInput,
  AuthSetActiveOrganizationResponse,
  AuthUpdateOrganizationInput,
} from '@/lib/types/auth'
import { getApiErrorCode, getApiErrorStatus } from '@/lib/utils/errors'

const sessionListResponseSchema = z.object({
  sessions: z.array(
    z.object({
      id: z.string(),
      current: z.boolean(),
      expiresAt: z.string().nullable(),
      ipAddress: z.string().nullable(),
      userAgent: z.string().nullable(),
      browser: z.string().nullable().optional(),
      os: z.string().nullable().optional(),
      device: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
    })
  ),
})

const activeOrganizationResponseSchema = z.object({
  activeOrganizationId: z.string().nullable(),
  activeOrganizationSlug: z.string().nullable(),
})

const createOrganizationResponseSchema = z.object({
  id: z.string().optional(),
  slug: z.string().optional(),
})

const organizationAccessControlResponseSchema = z.object({
  organization: z.object({
    membersCanSeeAllProjects: z.boolean(),
    membersCanRequestProjectAccess: z.boolean(),
  }),
})

const deleteAccountResponseSchema = z.object({
  deleted: z.literal(true),
  softDeleted: z.literal(true).optional(),
  purgeAfter: z.string().optional(),
})

const revokeSessionResponseSchema = z.object({
  revoked: z.boolean(),
  sessionId: z.string(),
})

const createApiKeyResponseSchema = z.object({
  headerName: z.string(),
  key: z.string(),
  apiKey: z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    start: z.string().nullable(),
    prefix: z.string().nullable(),
    expiresAt: z.string().nullable(),
    metadata: z.unknown(),
    rateLimitEnabled: z.boolean().nullable(),
    rateLimitMax: z.number().nullable(),
    rateLimitTimeWindow: z.number().nullable(),
  }),
})

const emailSignInResponseSchema = z
  .object({
    twoFactorRedirect: z.boolean().optional(),
    twoFactorMethods: z.array(z.string()).optional(),
  })
  .default({})

const resetPasswordResponseSchema = z.object({
  success: z.boolean().optional(),
  requiresMfa: z.boolean().optional(),
})

const mfaEnableResponseSchema = z.object({
  totpURI: z.string(),
  backupCodes: z.array(z.string()),
})

function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response
}

function isUpstreamUnavailableError(error: unknown): boolean {
  return getApiErrorStatus(error) === 503 && getApiErrorCode(error) === 'API_UPSTREAM_UNAVAILABLE'
}

export const authApi = {
  async getSession(): Promise<AuthSessionResponse | null> {
    if (isMockAuthEnabled()) {
      return hasAuthCookieHint() ? createMockSession() : null
    }

    try {
      const response = await apiClient.get<AuthSessionResponse>(AUTH_SESSION_PATH)
      return parseApiResponse(authSessionSchema, response.data)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return null
      }

      if (isNetworkError(error)) {
        return null
      }

      if (isUpstreamUnavailableError(error)) {
        return null
      }

      throw error
    }
  },

  async listSessions(): Promise<AuthSessionListApiResponse> {
    if (isMockAuthEnabled()) {
      if (!hasAuthCookieHint()) {
        return {
          sessions: [],
        }
      }

      return {
        sessions: [
          {
            id: 'mock-session-1',
            current: true,
            expiresAt: null,
            ipAddress: '127.0.0.1',
            userAgent: 'Mock Browser Session',
          },
        ],
      }
    }

    const response = await apiClient.get<AuthSessionListApiResponse>(AUTH_SESSIONS_PATH)
    return parseApiResponse(sessionListResponseSchema, response.data)
  },

  async listOrganizations(): Promise<AuthOrganizationsResponse> {
    if (isMockAuthEnabled()) {
      return {
        organizations: hasAuthCookieHint()
          ? [
              {
                organization: {
                  id: 'org_mock_1',
                  name: 'Mock Projects',
                  slug: 'mock-projects',
                  active: true,
                  isDefault: true,
                  defaultProjectVisibility: 'private',
                  privateProjectDiscoverability: 'visible',
                  membersCanSeeAllProjects: true,
                  membersCanRequestProjectAccess: true,
                },
                membership: {
                  id: 'org_member_mock_1',
                  userId: 'mock-user-1',
                  role: 'owner',
                  memberType: 'member',
                  expiresAt: null,
                },
              },
            ]
          : [],
      }
    }

    try {
      const response = await apiClient.get<AuthOrganizationsResponse>('/v1/auth/organizations')
      return parseApiResponse(authOrganizationsResponseSchema, response.data)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return {
          organizations: [],
        }
      }

      if (isNetworkError(error)) {
        return {
          organizations: [],
        }
      }

      if (isUpstreamUnavailableError(error)) {
        return {
          organizations: [],
        }
      }

      throw error
    }
  },

  async listOrganizationMembers(organizationId: string): Promise<AuthOrganizationMembersResponse> {
    if (isMockAuthEnabled()) {
      return {
        members: [
          {
            membership: {
              id: 'org_member_mock_1',
              userId: 'mock-user-1',
              role: 'owner',
              memberType: 'member',
              expiresAt: null,
            },
            user: {
              id: 'mock-user-1',
              name: 'Mock User',
              username: 'mock-user',
              email: env.mockAuthEmail,
              image: null,
            },
          },
        ],
      }
    }

    const response = await apiClient.get<AuthOrganizationMembersResponse>(
      `/v1/organizations/${organizationId}/members`
    )
    return parseApiResponse(authOrganizationMembersResponseSchema, response.data)
  },

  async setActiveOrganization(
    input: AuthSetActiveOrganizationInput
  ): Promise<AuthSetActiveOrganizationResponse> {
    if (isMockAuthEnabled()) {
      return {
        activeOrganizationId: input.organizationId ?? 'org_mock_1',
        activeOrganizationSlug: input.organizationSlug ?? 'mock-projects',
      }
    }

    const payload = {
      ...(input.organizationId !== undefined ? { organizationId: input.organizationId } : {}),
      ...(input.organizationSlug !== undefined ? { organizationSlug: input.organizationSlug } : {}),
    }

    const response = await apiClient.post<AuthSetActiveOrganizationResponse>(
      '/v1/auth/organizations/active',
      payload
    )
    return parseApiResponse(activeOrganizationResponseSchema, response.data)
  },

  async createOrganization(
    input: AuthCreateOrganizationInput
  ): Promise<{ id?: string; slug?: string }> {
    if (isMockAuthEnabled()) {
      return { id: 'org_mock_2', slug: input.slug ?? 'mock-projects-new' }
    }

    const response = await apiClient.post<{ id?: string; slug?: string }>(
      '/auth/organization/create',
      {
        name: input.name,
        ...(input.slug ? { slug: input.slug } : {}),
        logo: input.logo,
        metadata: input.metadata,
        keepCurrentActiveOrganization: input.keepCurrentActiveOrganization ?? false,
      }
    )
    return parseApiResponse(createOrganizationResponseSchema, response.data)
  },

  async updateOrganization(input: AuthUpdateOrganizationInput): Promise<void> {
    if (isMockAuthEnabled()) {
      return
    }

    await apiClient.post('/auth/organization/update', input)
  },

  async updateOrganizationAccessControl(
    organizationId: string,
    input: {
      membersCanSeeAllProjects?: boolean
      membersCanRequestProjectAccess?: boolean
    }
  ): Promise<{
    organization: {
      membersCanSeeAllProjects: boolean
      membersCanRequestProjectAccess: boolean
    }
  }> {
    if (isMockAuthEnabled()) {
      return {
        organization: {
          membersCanSeeAllProjects: input.membersCanSeeAllProjects ?? true,
          membersCanRequestProjectAccess: input.membersCanRequestProjectAccess ?? true,
        },
      }
    }

    const response = await apiClient.patch<{
      organization: {
        membersCanSeeAllProjects: boolean
        membersCanRequestProjectAccess: boolean
      }
    }>(`/v1/organizations/${organizationId}/access-control`, input)
    return parseApiResponse(organizationAccessControlResponseSchema, response.data)
  },

  async deleteOrganization(input: AuthDeleteOrganizationInput): Promise<void> {
    if (isMockAuthEnabled()) {
      return
    }

    await apiClient.delete(`/v1/organizations/${input.organizationId}`)
  },

  async updateUserName(input: { name: string }): Promise<void> {
    if (isMockAuthEnabled()) {
      return
    }

    await apiClient.post('/auth/update-user', input)
  },

  async deleteAccount(input: { email: string; totpCode?: string }): Promise<{
    deleted: true
    softDeleted?: true
    purgeAfter?: string
  }> {
    if (isMockAuthEnabled()) {
      clearClientAuthHint()
      return { deleted: true, softDeleted: true }
    }

    const response = await apiClient.delete<{
      deleted: true
      softDeleted?: true
      purgeAfter?: string
    }>('/v1/auth/account', {
      data: input,
    })
    return parseApiResponse(deleteAccountResponseSchema, response.data)
  },

  async revokeSession(input: AuthSessionRevokeRequest): Promise<AuthSessionRevokeResponse> {
    if (isMockAuthEnabled()) {
      return {
        revoked: true,
        sessionId: input.sessionId,
      }
    }

    const response = await apiClient.post<AuthSessionRevokeResponse>(
      AUTH_REVOKE_SESSION_PATH,
      input
    )
    return parseApiResponse(revokeSessionResponseSchema, response.data)
  },

  async createApiKey(input: AuthCreateApiKeyRequest): Promise<AuthCreateApiKeyResponse> {
    if (isMockAuthEnabled()) {
      return {
        headerName: 'x-pv-api-key',
        key: 'pv_mock_key_demo_only',
        apiKey: {
          id: 'mock-api-key-1',
          name: input.name ?? 'demo-mock-key',
          start: 'pv_mock',
          prefix: 'pv_mock',
          expiresAt: null,
          metadata: {
            mode: 'mock',
          },
          rateLimitEnabled: false,
          rateLimitMax: null,
          rateLimitTimeWindow: null,
        },
      }
    }

    const response = await apiClient.post<AuthCreateApiKeyResponse>('/v1/auth/api-keys', input)
    return parseApiResponse(createApiKeyResponseSchema, response.data)
  },

  async signInWithEmail(input: AuthSignInWithEmailInput): Promise<AuthSignInWithEmailResponse> {
    if (isMockAuthEnabled()) {
      if (!isMockCredential(input.email, input.password)) {
        throw new Error('Invalid email or password for mock account.')
      }

      setClientAuthHint()
      return {}
    }

    const response = await apiClient.post<AuthSignInWithEmailResponse>('/auth/sign-in/email', {
      email: input.email,
      password: input.password,
      rememberMe: true,
    })

    return parseApiResponse(emailSignInResponseSchema, response.data ?? {})
  },

  async signOut(): Promise<void> {
    if (isMockAuthEnabled()) {
      clearClientAuthHint()
      return
    }

    await apiClient.post('/auth/sign-out')
    clearClientAuthHint()
  },

  async startRegistration(input: AuthStartRegistrationInput): Promise<void> {
    if (isMockAuthEnabled()) {
      if (input.email.trim().toLowerCase() !== env.mockAuthEmail.trim().toLowerCase()) {
        throw new Error(`Use mock email ${env.mockAuthEmail} for UI-only mode.`)
      }

      setClientAuthHint()
      return
    }

    await apiClient.post('/v1/auth/register/start', {
      name: input.name,
      email: input.email,
      password: input.password,
    })
  },

  async resendRegistrationCode(input: { email: string }): Promise<void> {
    if (isMockAuthEnabled()) {
      return
    }

    await apiClient.post('/v1/auth/register/resend', {
      email: input.email,
    })
  },

  async completeRegistration(input: AuthCompleteRegistrationInput): Promise<void> {
    if (isMockAuthEnabled()) {
      return
    }

    await apiClient.post('/v1/auth/register/verify', input)
  },

  async sendEmailVerificationOtp(input: { email: string }): Promise<void> {
    if (isMockAuthEnabled()) {
      return
    }

    await apiClient.post('/auth/email-otp/send-verification-otp', {
      email: input.email,
      type: 'email-verification',
    })
  },

  async verifyEmailOtp(input: AuthVerifyEmailOtpInput): Promise<void> {
    if (isMockAuthEnabled()) {
      return
    }

    await apiClient.post('/auth/email-otp/verify-email', input)
  },

  async requestPasswordResetOtp(input: AuthRequestPasswordResetOtpInput): Promise<void> {
    if (isMockAuthEnabled()) {
      return
    }

    await apiClient.post('/auth/email-otp/request-password-reset', input)
  },

  async resetPasswordWithOtp(
    input: AuthResetPasswordWithOtpInput
  ): Promise<AuthResetPasswordWithOtpResponse> {
    if (isMockAuthEnabled()) {
      return { success: true }
    }

    const response = await apiClient.post<AuthResetPasswordWithOtpResponse>(
      '/auth/email-otp/reset-password',
      input
    )
    return parseApiResponse(resetPasswordResponseSchema, response.data ?? { success: true })
  },

  async enableMfa(input: AuthEnableMfaInput): Promise<AuthEnableMfaResponse> {
    if (isMockAuthEnabled()) {
      return {
        totpURI:
          'otpauth://totp/PentaVault:mock@example.com?secret=JBSWY3DPEHPK3PXP&issuer=PentaVault',
        backupCodes: ['mock-backup-1', 'mock-backup-2'],
      }
    }

    const response = await apiClient.post<AuthEnableMfaResponse>('/auth/two-factor/enable', input)
    return parseApiResponse(mfaEnableResponseSchema, response.data)
  },

  async verifyTotp(input: AuthVerifyTotpInput): Promise<void> {
    if (isMockAuthEnabled()) {
      return
    }

    await apiClient.post('/auth/two-factor/verify-totp', input)
  },

  async verifyBackupCode(input: AuthVerifyBackupCodeInput): Promise<void> {
    if (isMockAuthEnabled()) {
      return
    }

    await apiClient.post('/auth/two-factor/verify-backup-code', input)
  },

  async disableMfa(input: AuthDisableMfaInput): Promise<void> {
    if (isMockAuthEnabled()) {
      return
    }

    await apiClient.post('/v1/auth/mfa/disable', input)
  },

  async startMfaChange(input: AuthStartMfaChangeInput): Promise<AuthEnableMfaResponse> {
    if (isMockAuthEnabled()) {
      return {
        totpURI:
          'otpauth://totp/PentaVault:mock@example.com?secret=JBSWY3DPEHPK3PXP&issuer=PentaVault',
        backupCodes: ['mock-backup-1', 'mock-backup-2'],
      }
    }

    const response = await apiClient.post<AuthEnableMfaResponse>('/v1/auth/mfa/change/start', input)
    return parseApiResponse(mfaEnableResponseSchema, response.data)
  },

  async startRecoveryMfaSetup(
    input: AuthStartRecoveryMfaSetupInput
  ): Promise<AuthEnableMfaResponse> {
    if (isMockAuthEnabled()) {
      return {
        totpURI:
          'otpauth://totp/PentaVault:mock@example.com?secret=JBSWY3DPEHPK3PXP&issuer=PentaVault',
        backupCodes: ['mock-backup-1', 'mock-backup-2'],
      }
    }

    const response = await apiClient.post<AuthEnableMfaResponse>(
      '/v1/auth/mfa/recovery/start',
      input
    )
    return parseApiResponse(mfaEnableResponseSchema, response.data)
  },

  async completeMfaSetup(input: AuthCompleteMfaSetupInput): Promise<void> {
    if (isMockAuthEnabled()) {
      return
    }

    await apiClient.post('/v1/auth/mfa/setup/verify', input)
  },

  async changePassword(input: AuthChangePasswordInput): Promise<void> {
    if (isMockAuthEnabled()) {
      return
    }

    await apiClient.post('/v1/auth/password/change', input)
  },

  async approveDevice(userCode: string): Promise<void> {
    if (isMockAuthEnabled()) {
      if (!userCode.trim()) {
        throw new Error('Device code is required.')
      }

      setClientAuthHint()
      return
    }

    await apiClient.post('/auth/device/approve', {
      userCode,
    })
  },
}
