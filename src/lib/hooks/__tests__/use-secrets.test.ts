import { renderHook } from '@testing-library/react'

import { queryKeys } from '@/lib/query/keys'

import { useApprovePromotionRequest, useDeleteSecret, useUpdateSecret } from '../use-secrets'

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  approvePromotionRequest: vi.fn(),
  deleteSecret: vi.fn(),
  updateSecret: vi.fn(),
  useMutationMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: unknown) => mocks.useMutationMock(options),
  useQuery: vi.fn(),
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
  }),
}))

vi.mock('@/lib/api/secrets', () => ({
  secretsApi: {
    approvePromotionRequest: mocks.approvePromotionRequest,
    deleteSecret: mocks.deleteSecret,
    updateSecret: mocks.updateSecret,
  },
}))

function getMutationOptions<T>(hook: () => T): {
  onSuccess?: (result: unknown, input: { projectId: string }) => Promise<void>
} {
  renderHook(() => hook())
  return mocks.useMutationMock.mock.calls[0][0] as {
    onSuccess?: (result: unknown, input: { projectId: string }) => Promise<void>
  }
}

describe('secret mutation invalidation', () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockReset()
    mocks.approvePromotionRequest.mockReset()
    mocks.deleteSecret.mockReset()
    mocks.updateSecret.mockReset()
    mocks.useMutationMock.mockReset()
    mocks.useMutationMock.mockImplementation((options: unknown) => options)
  })

  it('refreshes project and personal secret lists after updating a secret', async () => {
    const options = getMutationOptions(useUpdateSecret)

    await options.onSuccess?.({}, { projectId: 'project_1' })

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.projectSecrets.list('project_1'),
    })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.projectSecrets.personal('project_1'),
    })
  })

  it('refreshes project and personal secret lists after deleting a secret', async () => {
    const options = getMutationOptions(useDeleteSecret)

    await options.onSuccess?.({}, { projectId: 'project_1' })

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.projectSecrets.list('project_1'),
    })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.projectSecrets.personal('project_1'),
    })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.projectTokens.list('project_1'),
    })
  })

  it('refreshes personal secrets, access, and tokens after approving promotion', async () => {
    const options = getMutationOptions(useApprovePromotionRequest)

    await options.onSuccess?.({}, { projectId: 'project_1' })

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.projectSecrets.list('project_1'),
    })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.projectSecrets.personal('project_1'),
    })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.projectSecrets.access('project_1'),
    })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.projectTokens.list('project_1'),
    })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.notifications.all,
    })
  })
})
