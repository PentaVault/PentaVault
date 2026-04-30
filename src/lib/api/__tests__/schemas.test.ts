import {
  parseApiResponse,
  projectSecretsResponseSchema,
  userProjectSchema,
} from '@/lib/api/schemas'
import type { ProjectResponse, ProjectSecretsResponse } from '@/lib/types/api'

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
})
