import axios from 'axios'

import { apiClient } from '@/lib/api/client'
import { createMockSession, isMockAuthEnabled, isMockCredential } from '@/lib/auth/mock-auth'
import { clearClientAuthHint, hasAuthCookieHint, setClientAuthHint } from '@/lib/auth/token'
import { AUTH_REVOKE_SESSION_PATH, AUTH_SESSIONS_PATH, AUTH_SESSION_PATH } from '@/lib/constants'
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
      return response.data
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
    return response.data
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
      return response.data
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
    return response.data
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
    return response.data
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
    return response.data
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
    return response.data
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

  async deleteAccount(input: { email: string; totpCode?: string }): Promise<{ deleted: true }> {
    if (isMockAuthEnabled()) {
      clearClientAuthHint()
      return { deleted: true }
    }

    const response = await apiClient.delete<{ deleted: true }>('/v1/auth/account', {
      data: input,
    })
    return response.data
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
    return response.data
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
    return response.data
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

    return response.data ?? {}
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
    return response.data ?? { success: true }
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
    return response.data
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
    return response.data
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
    return response.data
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
