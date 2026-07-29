import { renderHook } from '@testing-library/react'

import { queryKeys } from '@/lib/query/keys'

import { useFolderCommits, useFolderDiff } from '../use-folder-commits'
import { useAdoptOrganizationEncryptionKey } from '../use-organization-keys'
import { useIssueScimToken, useRevokeScimToken } from '../use-scim'
import { useCreateSsoConnection, useVerifySsoConnection } from '../use-sso'

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: unknown) => mocks.useMutation(options),
  useQuery: (options: unknown) => mocks.useQuery(options),
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}))

vi.mock('@/lib/api/sso', () => ({ ssoApi: { create: vi.fn(), verify: vi.fn() } }))
vi.mock('@/lib/api/scim', () => ({ scimApi: { issue: vi.fn(), revoke: vi.fn() } }))
vi.mock('@/lib/api/organization-keys', () => ({ organizationKeysApi: { adopt: vi.fn() } }))
vi.mock('@/lib/api/folder-commits', () => ({
  folderCommitsApi: { list: vi.fn(), diff: vi.fn() },
}))

function mutationOptions(hook: () => unknown) {
  renderHook(hook)
  return mocks.useMutation.mock.calls[0]?.[0] as {
    onSuccess?: () => Promise<void>
    mutationFn: (input: never) => unknown
  }
}

function queryOptions(hook: () => unknown) {
  renderHook(hook)
  return mocks.useQuery.mock.calls[0]?.[0] as {
    queryKey: readonly unknown[]
    queryFn: () => Promise<unknown>
    enabled: boolean
  }
}

describe('mutation invalidation', () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockReset()
    mocks.useMutation.mockReset()
    mocks.useQuery.mockReset()
    mocks.useMutation.mockImplementation((options: unknown) => options)
    mocks.useQuery.mockImplementation((options: unknown) => options)
  })

  it('refreshes the connection list after creating one', async () => {
    await mutationOptions(() => useCreateSsoConnection()).onSuccess?.()
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.ssoConnections.all,
    })
  })

  it('does not refresh anything after a verification', () => {
    // Verifying is a read-only diagnostic; invalidating would cause a needless
    // refetch of unchanged data.
    expect(mutationOptions(() => useVerifySsoConnection()).onSuccess).toBeUndefined()
  })

  it('refreshes SCIM tokens after issuing and revoking', async () => {
    await mutationOptions(() => useIssueScimToken()).onSuccess?.()
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.scimTokens.all })

    mocks.useMutation.mockClear()
    mocks.invalidateQueries.mockClear()
    await mutationOptions(() => useRevokeScimToken()).onSuccess?.()
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.scimTokens.all })
  })

  it('refreshes encryption keys after adopting one', async () => {
    await mutationOptions(() => useAdoptOrganizationEncryptionKey()).onSuccess?.()
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.organizationEncryptionKeys.all,
    })
  })
})

describe('folder commit queries', () => {
  beforeEach(() => {
    mocks.useQuery.mockReset()
    mocks.useQuery.mockImplementation((options: unknown) => options)
  })

  it('stays disabled without a project', () => {
    const options = queryOptions(() => useFolderCommits(null))
    expect(options.enabled).toBe(false)
  })

  it('refuses to fetch without a project even if forced', async () => {
    const options = queryOptions(() => useFolderCommits(null))
    await expect(options.queryFn()).rejects.toThrow(/projectId is required/)
  })

  it('defaults the folder to the root', () => {
    const options = queryOptions(() => useFolderCommits('project-1'))
    expect(options.queryKey).toEqual(queryKeys.projectFolderCommits.list('project-1', '/'))
  })

  it('stays disabled until both diff endpoints are chosen', () => {
    mocks.useQuery.mockClear()
    expect(queryOptions(() => useFolderDiff('project-1', 'a', null)).enabled).toBe(false)

    mocks.useQuery.mockClear()
    expect(queryOptions(() => useFolderDiff('project-1', 'a', 'b')).enabled).toBe(true)
  })

  it('refuses to diff with only one endpoint', async () => {
    const options = queryOptions(() => useFolderDiff('project-1', 'a', null))
    await expect(options.queryFn()).rejects.toThrow(/Two commits are required/)
  })
})
