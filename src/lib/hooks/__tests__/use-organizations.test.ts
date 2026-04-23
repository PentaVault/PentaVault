import { renderHook } from '@testing-library/react'

import { useSwitchOrganization } from '../use-organizations'

const invalidateQueries = jest.fn()
const cancelQueries = jest.fn()
const removeQueries = jest.fn()
const replace = jest.fn()
const refresh = jest.fn()
const toastError = jest.fn()
const switchOrg = jest.fn()
const useMutationMock = jest.fn()

jest.mock('@tanstack/react-query', () => ({
  useMutation: (options: unknown) => useMutationMock(options),
  useQueryClient: () => ({ cancelQueries, invalidateQueries, removeQueries }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
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
    cancelQueries.mockReset()
    cancelQueries.mockResolvedValue(undefined)
    removeQueries.mockReset()
    replace.mockReset()
    refresh.mockReset()
    refresh.mockResolvedValue(undefined)
    toastError.mockReset()
    switchOrg.mockReset()
    switchOrg.mockResolvedValue({ activeOrganizationId: 'org_2', activeOrganizationSlug: 'acme' })
    useMutationMock.mockReset()
    useMutationMock.mockImplementation((options: unknown) => options)
  })

  it('calls organizationsApi.switch with orgId', async () => {
    const options = getMutationOptions()

    await options.mutationFn('org_2')

    expect(switchOrg).toHaveBeenCalledWith('org_2')
  })

  it('cancels active queries before switching', async () => {
    const options = getMutationOptions()

    await options.onMutate()

    expect(cancelQueries).toHaveBeenCalled()
  })

  it('refreshes organisation-scoped caches on success', async () => {
    const options = getMutationOptions()

    await options.onSuccess({}, 'org_2')

    expect(removeQueries).toHaveBeenCalledWith({ queryKey: ['project'] })
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: ['project-members'] })
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: ['project-secrets'] })
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: ['project-tokens'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['projects'] })
  })

  it('calls auth refresh on success', async () => {
    const options = getMutationOptions()

    await options.onSuccess({}, 'org_2')

    expect(refresh).toHaveBeenCalled()
  })

  it('redirects to dashboard overview when switching organisations', async () => {
    const options = getMutationOptions()

    await options.onSuccess({}, 'org_2')

    expect(replace).toHaveBeenCalledWith('/dashboard')
  })

  it('shows error toast on failure without changing any state', () => {
    const options = getMutationOptions()

    options.onError(new Error('boom'))

    expect(toastError).toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })
})
