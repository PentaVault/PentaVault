import { renderHook } from '@testing-library/react'

import { queryKeys } from '@/lib/query/keys'

import { useRemoveOrganizationMember } from '../use-team'

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  removeQueries: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  removeOrganizationMember: vi.fn(),
  useMutationMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: unknown) => mocks.useMutationMock(options),
  useQuery: vi.fn(),
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
    removeQueries: mocks.removeQueries,
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
}))

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    session: {
      user: {
        id: 'user_current',
      },
    },
    refresh: mocks.refresh,
  }),
}))

vi.mock('@/lib/api/team', () => ({
  teamApi: {
    removeOrganizationMember: mocks.removeOrganizationMember,
  },
}))

function getMutationOptions(): Record<string, (...args: unknown[]) => unknown> {
  renderHook(() => useRemoveOrganizationMember('org_1'))
  return mocks.useMutationMock.mock.calls[0][0] as Record<string, (...args: unknown[]) => unknown>
}

describe('useRemoveOrganizationMember', () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockReset()
    mocks.invalidateQueries.mockResolvedValue(undefined)
    mocks.removeQueries.mockReset()
    mocks.replace.mockReset()
    mocks.refresh.mockReset()
    mocks.refresh.mockResolvedValue(undefined)
    mocks.removeOrganizationMember.mockReset()
    mocks.removeOrganizationMember.mockResolvedValue({ removed: true, userId: 'user_current' })
    mocks.useMutationMock.mockReset()
    mocks.useMutationMock.mockImplementation((options: unknown) => options)
  })

  it('refreshes auth state and clears organization-scoped cache when the current user leaves', async () => {
    const options = getMutationOptions()

    await options.onSuccess({ removed: true, userId: 'user_current' }, 'user_current')

    expect(mocks.removeQueries).toHaveBeenCalledWith({ queryKey: queryKeys.projects.all })
    expect(mocks.removeQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.organizationMembers.all,
    })
    expect(mocks.removeQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.organizationInvitations.all,
    })
    expect(mocks.removeQueries).toHaveBeenCalledWith({ queryKey: queryKeys.organizations.all })
    expect(mocks.refresh).toHaveBeenCalled()
    expect(mocks.replace).toHaveBeenCalledWith('/dashboard')
  })

  it('only refreshes the member list when removing a different user', async () => {
    const options = getMutationOptions()

    await options.onSuccess({ removed: true, userId: 'user_other' }, 'user_other')

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.organizationMembers.list('org_1'),
    })
    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(mocks.replace).not.toHaveBeenCalled()
  })
})
