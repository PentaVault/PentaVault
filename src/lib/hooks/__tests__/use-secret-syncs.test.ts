import { renderHook } from '@testing-library/react'

import { queryKeys } from '@/lib/query/keys'
import {
  useCreateSecretSync,
  useRetrySecretSyncDelivery,
  useRunSecretSync,
} from '../use-secret-syncs'

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  useMutation: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: unknown) => mocks.useMutation(options),
  useQuery: vi.fn(),
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}))

vi.mock('@/lib/api/secret-syncs', () => ({
  secretSyncsApi: { create: vi.fn(), retry: vi.fn(), run: vi.fn() },
}))

function mutationOptions(hook: () => unknown) {
  renderHook(hook)
  return mocks.useMutation.mock.calls[0]?.[0] as { onSuccess: () => Promise<void> }
}

describe('secret sync mutation invalidation', () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockReset()
    mocks.useMutation.mockReset()
    mocks.useMutation.mockImplementation((options: unknown) => options)
  })

  it.each([
    ['create', () => useCreateSecretSync('project_1')],
    ['run', () => useRunSecretSync('project_1')],
    ['retry', () => useRetrySecretSyncDelivery('project_1')],
  ])('refreshes destinations and delivery history after %s', async (_name, hook) => {
    await mutationOptions(hook).onSuccess()
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.projectSecretSyncs.list('project_1'),
    })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.projectSecretSyncs.all,
    })
  })
})
