import { secretsApi } from '@/lib/api/secrets'
import { tokensApi } from '@/lib/api/tokens'

const apiClientMock = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: apiClientMock.post },
}))

describe('secret access API', () => {
  it('forwards explicit expiries to single and batch grant routes', async () => {
    const expiresAt = '2026-07-17T00:00:00.000Z'
    apiClientMock.post.mockResolvedValueOnce({
      data: {
        access: {
          id: 'access_1',
          projectId: 'project_1',
          userId: 'user_1',
          secretId: 'secret_1',
          environmentId: null,
          accessLevel: 'read',
          status: 'active',
          grantedBy: 'admin_1',
          revokedBy: null,
          expiresAt,
          grantedAt: '2026-07-16T00:00:00.000Z',
          revokedAt: null,
          createdAt: '2026-07-16T00:00:00.000Z',
          updatedAt: '2026-07-16T00:00:00.000Z',
        },
      },
    })

    await secretsApi.grantSecretAccess({
      projectId: 'project_1',
      secretId: 'secret_1',
      userId: 'user_1',
      expiresAt,
    })
    expect(apiClientMock.post).toHaveBeenLastCalledWith(
      '/v1/projects/project_1/secrets/secret_1/access',
      { userId: 'user_1', environmentId: undefined, expiresAt }
    )

    apiClientMock.post.mockResolvedValueOnce({ data: { tokens: [] } })
    await tokensApi.batchIssueTokens({
      projectId: 'project_1',
      secretIds: ['secret_1'],
      userId: 'user_1',
      expiresAt: null,
    })
    expect(apiClientMock.post).toHaveBeenLastCalledWith(
      '/v1/projects/project_1/tokens/batch-issue',
      { secretIds: ['secret_1'], userId: 'user_1', expiresAt: null }
    )
  })
})
