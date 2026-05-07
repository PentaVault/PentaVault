import {
  orgInvitationResponseSchema,
  parseApiInput,
  parseApiResponse,
  projectSecretsResponseSchema,
  sendOrgInvitationInputSchema,
  userProjectSchema,
  verifyInvitationResponseSchema,
} from '@/lib/api/schemas'
import type {
  OrgInvitationResponse,
  ProjectResponse,
  ProjectSecretsResponse,
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
