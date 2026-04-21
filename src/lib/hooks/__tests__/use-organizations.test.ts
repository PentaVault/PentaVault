import { renderHook } from '@testing-library/react'

import { useSwitchOrganization } from '../use-organizations'

const invalidateQueries = jest.fn()
const replace = jest.fn()
const refresh = jest.fn()
const toastError = jest.fn()
const switchOrg = jest.fn()
const useMutationMock = jest.fn()
const usePathnameMock = jest.fn()

jest.mock('@tanstack/react-query', () => ({
  useMutation: (options: unknown) => useMutationMock(options),
  useQueryClient: () => ({ invalidateQueries }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => usePathnameMock(),
}))

jest.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({ refresh }),
}))

jest.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { error: toastError } }),
}))

jest.mock('@/lib/api/organizations', () => ({
  organizationsApi: {
    switch: (...args: unknown[]) => switchOrg(...args),
  },
}))

function getMutationOptions(): Record<string, (...args: unknown[]) => unknown> {
  renderHook(() => useSwitchOrganization())
  return useMutationMock.mock.calls[0][0] as Record<string, (...args: unknown[]) => unknown>
}

describe('useSwitchOrganization', () => {
  beforeEach(() => {
    invalidateQueries.mockReset()
    invalidateQueries.mockResolvedValue(undefined)
    replace.mockReset()
    refresh.mockReset()
    refresh.mockResolvedValue(undefined)
    toastError.mockReset()
    switchOrg.mockReset()
    switchOrg.mockResolvedValue({ activeOrganizationId: 'org_2', activeOrganizationSlug: 'acme' })
    usePathnameMock.mockReset()
    useMutationMock.mockReset()
    useMutationMock.mockImplementation((options: unknown) => options)
  })

  it('calls organizationsApi.switch with orgId', async () => {
    usePathnameMock.mockReturnValue('/dashboard')
    const options = getMutationOptions()

    await options.mutationFn('org_2')

    expect(switchOrg).toHaveBeenCalledWith('org_2')
  })

  it('invalidates all queries on success', async () => {
    usePathnameMock.mockReturnValue('/dashboard')
    const options = getMutationOptions()

    await options.onSuccess({}, 'org_2')

    expect(invalidateQueries).toHaveBeenCalledWith()
  })

  it('calls auth refresh on success', async () => {
    usePathnameMock.mockReturnValue('/dashboard')
    const options = getMutationOptions()

    await options.onSuccess({}, 'org_2')

    expect(refresh).toHaveBeenCalled()
  })

  it('redirects to /projects when switching from a project detail page', async () => {
    usePathnameMock.mockReturnValue('/projects/project_1')
    const options = getMutationOptions()

    await options.onSuccess({}, 'org_2')

    expect(replace).toHaveBeenCalledWith('/projects')
  })

  it('replaces current route when not on a project page', async () => {
    usePathnameMock.mockReturnValue('/dashboard/org/org_1/settings')
    const options = getMutationOptions()

    await options.onSuccess({}, 'org_2')

    expect(replace).toHaveBeenCalledWith('/dashboard/org/org_2/settings')
  })

  it('shows error toast on failure without changing any state', () => {
    usePathnameMock.mockReturnValue('/dashboard')
    const options = getMutationOptions()

    options.onError(new Error('boom'))

    expect(toastError).toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })
})
