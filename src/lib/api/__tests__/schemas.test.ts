import {
  orgInvitationResponseSchema,
  parseApiInput,
  parseApiResponse,
  projectAnalyticsResponseSchema,
  projectEnvironmentsResponseSchema,
  projectSecretAccessResponseSchema,
  projectSecretsResponseSchema,
  projectSettingsResponseSchema,
  promotionRequestsResponseSchema,
  sendOrgInvitationInputSchema,
  userProjectSchema,
  verifyInvitationResponseSchema,
} from '@/lib/api/schemas'
import type {
  OrgInvitationResponse,
  ProjectAnalyticsResponse,
  ProjectEnvironmentsResponse,
  ProjectResponse,
  ProjectSecretAccessResponse,
  ProjectSecretsResponse,
  ProjectSettingsResponse,
  PromotionRequestsResponse,
  VerifyInvitationResponse,
} from '@/lib/types/api'

describe('API schema parsing', () => {
  it('accepts valid API response data', () => {
    const parsed = parseApiResponse<ProjectSecretsResponse>(projectSecretsResponseSchema, {
      secrets: [
        {
          id: 'secret_123',
          projectId: 'project_123',
          environment: 'production',
          name: 'STRIPE_API_KEY',
          mode: 'gateway',
          status: 'active',
          currentVersionId: 'version_123',
          createdAt: '2026-04-29T00:00:00.000Z',
          updatedAt: '2026-04-29T00:00:00.000Z',
        },
      ],
    })

    expect(parsed.secrets[0]?.name).toBe('STRIPE_API_KEY')
  })

  it('accepts core secrets engine metadata on secrets and tokens adjacent responses', () => {
    const parsed = parseApiResponse<ProjectSecretsResponse>(projectSecretsResponseSchema, {
      secrets: [
        {
          id: 'secret_123',
          projectId: 'project_123',
          organizationId: 'org_123',
          environment: 'production',
          environmentId: 'env_prod',
          name: 'STRIPE_API_KEY',
          mode: 'gateway',
          encryptionMode: 'plaintext',
          isSensitive: true,
          scope: 'personal',
          status: 'active',
          currentVersionId: 'version_123',
          createdByUserId: 'user_123',
          promotedFromSecretId: null,
          version: 2,
          plaintextValue: 'recoverable-dev-value',
          createdAt: '2026-04-29T00:00:00.000Z',
          updatedAt: '2026-04-29T00:00:00.000Z',
        },
      ],
    })

    expect(parsed.secrets[0]?.environmentId).toBe('env_prod')
    expect(parsed.secrets[0]?.encryptionMode).toBe('plaintext')
    expect(parsed.secrets[0]?.plaintextValue).toBe('recoverable-dev-value')
  })

  it('accepts project environment and settings responses', () => {
    const environments = parseApiResponse<ProjectEnvironmentsResponse>(
      projectEnvironmentsResponseSchema,
      {
        environments: [
          {
            id: 'env_dev',
            projectId: 'project_123',
            name: 'Development',
            slug: 'development',
            color: '#22c55e',
            isDefault: true,
            createdAt: '2026-05-02T00:00:00.000Z',
          },
        ],
      }
    )
    const settings = parseApiResponse<ProjectSettingsResponse>(projectSettingsResponseSchema, {
      settings: {
        projectId: 'project_123',
        accessMode: 'both',
        defaultTtlSeconds: 86400,
        requireDeviceBinding: true,
        maxRequestsPerTokenPerDay: 10000,
        allowPersonalSecrets: true,
        requireMemberApprovalForSecretAccess: false,
        updatedAt: '2026-05-02T00:00:00.000Z',
      },
    })

    expect(environments.environments[0]?.slug).toBe('development')
    expect(settings.settings.accessMode).toBe('both')
  })

  it('accepts project analytics responses', () => {
    const parsed = parseApiResponse<ProjectAnalyticsResponse>(projectAnalyticsResponseSchema, {
      summary: {
        totalAccesses: 1,
        uniqueUsers: 1,
        uniqueDevices: 1,
        accessByMode: { direct: 1, proxy: 0 },
        errorRate: 0,
        avgResponseTimeMs: 12,
        recentEvents: [],
      },
      events: [
        {
          id: 'sae_123',
          organizationId: 'org_123',
          projectId: 'project_123',
          environmentId: 'env_dev',
          secretId: 'secret_123',
          userId: 'user_123',
          proxyTokenId: 'token_hash',
          accessMode: 'direct',
          eventType: 'resolved',
          deviceFingerprint: 'device_hash',
          ipAddress: '127.0.0.1',
          userAgent: 'vitest',
          countryCode: null,
          responseTimeMs: 12,
          upstreamStatus: null,
          errorCode: null,
          occurredAt: '2026-05-02T00:00:00.000Z',
        },
      ],
      scope: {
        projectId: 'project_123',
        effectiveRole: 'owner',
        granularity: 'day',
        from: null,
        to: null,
      },
    })

    expect(parsed.summary.totalAccesses).toBe(1)
    expect(parsed.events[0]?.eventType).toBe('resolved')
  })

  it('accepts user secret access and promotion request responses', () => {
    const access = parseApiResponse<ProjectSecretAccessResponse>(
      projectSecretAccessResponseSchema,
      {
        access: [
          {
            id: 'usa_123',
            projectId: 'project_123',
            userId: 'user_member',
            secretId: 'secret_123',
            environmentId: 'env_dev',
            accessLevel: 'read',
            status: 'active',
            grantedBy: 'user_admin',
            revokedBy: null,
            expiresAt: null,
            grantedAt: '2026-05-02T00:00:00.000Z',
            revokedAt: null,
            createdAt: '2026-05-02T00:00:00.000Z',
            updatedAt: '2026-05-02T00:00:00.000Z',
          },
        ],
      }
    )
    const promotions = parseApiResponse<PromotionRequestsResponse>(
      promotionRequestsResponseSchema,
      {
        requests: [
          {
            id: 'pspr_123',
            projectId: 'project_123',
            personalSecretId: 'secret_personal',
            requestedByUserId: 'user_member',
            status: 'pending',
            targetEnvironmentId: 'env_dev',
            targetEnvironment: 'development',
            targetName: 'OPENAI_API_KEY',
            promotedSecretId: null,
            reviewedByUserId: null,
            reviewerNote: null,
            createdAt: '2026-05-02T00:00:00.000Z',
            updatedAt: '2026-05-02T00:00:00.000Z',
          },
        ],
      }
    )

    expect(access.access[0]?.accessLevel).toBe('read')
    expect(promotions.requests[0]?.status).toBe('pending')
  })

  it('fails closed on malformed API response data', () => {
    expect(() =>
      parseApiResponse(projectSecretsResponseSchema, {
        secrets: [
          {
            id: 'secret_123',
            projectId: 'project_123',
            environment: 'production',
            name: 'STRIPE_API_KEY',
            mode: 'gateway',
            status: 'active',
            currentVersionId: null,
            createdAt: '2026-04-29T00:00:00.000Z',
            updatedAt: '2026-04-29T00:00:00.000Z',
          },
        ],
      })
    ).toThrow()
  })

  it('accepts project create responses with access metadata', () => {
    const parsed = parseApiResponse<ProjectResponse>(userProjectSchema, {
      project: {
        id: 'project_123',
        organizationId: 'org_123',
        slug: 'my-project',
        name: 'My Project',
        visibility: 'private',
        showAllVariablesToMembers: true,
        requireAccessRequest: false,
        autoJoinForOrgMembers: false,
        status: 'active',
        createdByUserId: 'user_123',
        archivedAt: null,
        createdAt: '2026-04-29T00:00:00.000Z',
        updatedAt: '2026-04-29T00:00:00.000Z',
      },
      membership: {
        id: 'project_member_123',
        projectId: 'project_123',
        userId: 'user_123',
        role: 'owner',
        grantSource: 'manual',
        createdAt: '2026-04-29T00:00:00.000Z',
      },
      orgRole: 'owner',
      canAccess: true,
      canRequestAccess: false,
      effectiveRole: 'owner',
      pendingAccessRequest: false,
      latestRequestStatus: null,
      latestAccessRequest: null,
    })

    expect(parsed.project.slug).toBe('my-project')
  })

  it('normalizes legacy developer project roles in project responses', () => {
    const parsed = parseApiResponse<ProjectResponse>(userProjectSchema, {
      project: {
        id: 'project_123',
        organizationId: 'org_123',
        slug: 'legacy-project',
        name: 'Legacy Project',
        visibility: 'private',
        showAllVariablesToMembers: true,
        requireAccessRequest: false,
        autoJoinForOrgMembers: false,
        status: 'active',
        createdByUserId: 'user_123',
        archivedAt: null,
        createdAt: '2026-04-29T00:00:00.000Z',
        updatedAt: '2026-04-29T00:00:00.000Z',
      },
      membership: {
        id: 'project_member_123',
        projectId: 'project_123',
        userId: 'user_123',
        role: 'developer',
        grantSource: 'manual',
        createdAt: '2026-04-29T00:00:00.000Z',
      },
      orgRole: 'developer',
      canAccess: true,
      canRequestAccess: false,
      effectiveRole: 'developer',
      pendingAccessRequest: false,
      latestRequestStatus: null,
      latestAccessRequest: null,
    })

    expect(parsed.membership?.role).toBe('member')
    expect(parsed.effectiveRole).toBe('member')
  })

  it('normalizes legacy readonly project roles in project responses', () => {
    const parsed = parseApiResponse<ProjectResponse>(userProjectSchema, {
      project: {
        id: 'project_123',
        organizationId: 'org_123',
        slug: 'legacy-readonly-project',
        name: 'Legacy Readonly Project',
        visibility: 'private',
        showAllVariablesToMembers: true,
        requireAccessRequest: false,
        autoJoinForOrgMembers: false,
        status: 'active',
        createdByUserId: 'user_123',
        archivedAt: null,
        createdAt: '2026-04-29T00:00:00.000Z',
        updatedAt: '2026-04-29T00:00:00.000Z',
      },
      membership: {
        id: 'project_member_123',
        projectId: 'project_123',
        userId: 'user_123',
        role: 'readonly',
        grantSource: 'manual',
        createdAt: '2026-04-29T00:00:00.000Z',
      },
      orgRole: 'readonly',
      canAccess: true,
      canRequestAccess: false,
      effectiveRole: 'readonly',
      pendingAccessRequest: false,
      latestRequestStatus: null,
      latestAccessRequest: null,
    })

    expect(parsed.membership?.role).toBe('member')
    expect(parsed.effectiveRole).toBe('member')
    expect(parsed.orgRole).toBe('auditor')
  })

  it('normalizes legacy readonly organization roles in invitation responses', () => {
    const parsed = parseApiResponse<OrgInvitationResponse>(orgInvitationResponseSchema, {
      invitation: {
        id: 'invite_123',
        organizationId: 'org_123',
        email: 'auditor@example.com',
        role: 'readonly',
        status: 'pending',
        expiresAt: '2026-05-07T00:00:00.000Z',
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
        inviterId: 'user_owner',
        memberType: 'member',
        acceptedByUserId: null,
      },
      emailSent: true,
    })

    expect(parsed.invitation.role).toBe('auditor')
  })

  it('normalizes legacy readonly organization roles in invitation verification responses', () => {
    const parsed = parseApiResponse<VerifyInvitationResponse>(verifyInvitationResponseSchema, {
      valid: true,
      expired: false,
      alreadyUsed: false,
      status: 'pending',
      organizationName: 'Acme',
      invitedByName: 'Owner User',
      role: 'readonly',
      email: 'auditor@example.com',
      expiresAt: '2026-05-07T00:00:00.000Z',
    })

    expect(parsed.role).toBe('auditor')
  })

  it('rejects legacy readonly organization roles in outgoing invite input', () => {
    expect(() =>
      parseApiInput(sendOrgInvitationInputSchema, {
        email: 'auditor@example.com',
        role: 'readonly',
      })
    ).toThrow()
  })
})
