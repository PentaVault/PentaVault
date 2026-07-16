import { secretsApi } from '@/lib/api/secrets'

const apiClientMock = vi.hoisted(() => ({ patch: vi.fn() }))

vi.mock('@/lib/api/client', () => ({
  apiClient: { patch: apiClientMock.patch },
}))

describe('secret metadata API', () => {
  it('forwards explicit rotation policy changes', async () => {
    apiClientMock.patch.mockResolvedValueOnce({
      data: {
        secret: {
          id: 'secret_1',
          projectId: 'project_1',
          environment: 'production',
          name: 'DATABASE_URL',
          mode: 'compatibility',
          status: 'active',
          currentVersionId: 'secret_1:v1',
          rotationIntervalDays: 30,
          rotationReminderDays: 7,
          nextRotationAt: '2026-08-15T00:00:00.000Z',
          createdAt: '2026-07-16T00:00:00.000Z',
          updatedAt: '2026-07-16T00:00:00.000Z',
        },
      },
    })

    await secretsApi.updateSecretMetadata({
      projectId: 'project_1',
      secretId: 'secret_1',
      rotationIntervalDays: 30,
      rotationReminderDays: 7,
    })

    expect(apiClientMock.patch).toHaveBeenCalledWith(
      '/v1/projects/project_1/secrets/secret_1/metadata',
      {
        description: undefined,
        folderPath: undefined,
        tags: undefined,
        rotationIntervalDays: 30,
        rotationReminderDays: 7,
      }
    )
  })
})
