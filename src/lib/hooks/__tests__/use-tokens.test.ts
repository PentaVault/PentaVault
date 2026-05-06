import { renderHook } from '@testing-library/react'

import { tokensApi } from '@/lib/api/tokens'

import { useGenerateToken } from '../use-tokens'

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  issueToken: vi.fn(),
  useMutationMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: unknown) => mocks.useMutationMock(options),
  useQuery: vi.fn(),
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
  }),
}))

vi.mock('@/lib/api/tokens', () => ({
  tokensApi: {
    issueToken: mocks.issueToken,
  },
}))

function getMutationOptions(): {
  mutationFn: (input: {
    projectId: string
    secretId: string
    mode: 'compatibility' | 'gateway'
  }) => Promise<unknown>
} {
  renderHook(() => useGenerateToken())
  return mocks.useMutationMock.mock.calls[0][0] as {
    mutationFn: (input: {
      projectId: string
      secretId: string
      mode: 'compatibility' | 'gateway'
    }) => Promise<unknown>
  }
}

describe('useGenerateToken', () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockReset()
    mocks.issueToken.mockReset()
    mocks.issueToken.mockResolvedValue({
      token: 'pv_tok_example',
      tokenStart: 'pv_tok_example',
      tokenHash: 'hash',
      userId: 'user_1',
      secretId: 'secret_1',
      mode: 'compatibility',
      expiresAt: '2026-05-07T00:00:00.000Z',
    })
    mocks.useMutationMock.mockReset()
    mocks.useMutationMock.mockImplementation((options: unknown) => options)
  })

  it('uses projectId for cache context without sending it to the token issue body', async () => {
    const options = getMutationOptions()

    await options.mutationFn({
      projectId: 'project_1',
      secretId: 'secret_1',
      mode: 'compatibility',
    })

    expect(tokensApi.issueToken).toHaveBeenCalledWith({
      secretId: 'secret_1',
      mode: 'compatibility',
    })
  })
})
