import { parseApiResponse, projectSecretsResponseSchema } from '@/lib/api/schemas'
import type { ProjectSecretsResponse } from '@/lib/types/api'

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
})
