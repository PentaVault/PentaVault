import { renderHook } from '@testing-library/react'

import { queryKeys } from '@/lib/query/keys'

import { useCreateWebhook, useRetryWebhookDelivery, useTestWebhook } from '../use-webhooks'

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  useMutation: vi.fn(),
  create: vi.fn(),
  retry: vi.fn(),
  test: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: unknown) => mocks.useMutation(options),
  useQuery: vi.fn(),
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}))

vi.mock('@/lib/api/webhooks', () => ({
  webhooksApi: {
    create: mocks.create,
    retry: mocks.retry,
    test: mocks.test,
  },
}))

function mutationOptions(hook: () => unknown) {
  renderHook(hook)
  return mocks.useMutation.mock.calls[0]?.[0] as {
    onSuccess: () => Promise<void>
  }
}

describe('webhook mutation invalidation', () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockReset()
    mocks.useMutation.mockReset()
    mocks.useMutation.mockImplementation((options: unknown) => options)
  })

  it.each([
    ['create', () => useCreateWebhook('project_1')],
    ['test', () => useTestWebhook('project_1')],
    ['retry', () => useRetryWebhookDelivery('project_1')],
  ])('refreshes configuration and delivery history after %s', async (_name, hook) => {
    await mutationOptions(hook).onSuccess()

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.projectWebhooks.list('project_1'),
    })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.projectWebhooks.all,
    })
  })
})
