import { renderHook } from '@testing-library/react'

import { queryKeys } from '@/lib/query/keys'

import { useSwitchOrganization } from '../use-organizations'

const invalidateQueries = vi.fn()
const cancelQueries = vi.fn()
const removeQueries = vi.fn()
const replace = vi.fn()
const refresh = vi.fn()
const setActiveOrganization = vi.fn()
const toastError = vi.fn()
const useMutationMock = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: unknown) => useMutationMock(options),
  useQueryClient: () => ({ cancelQueries, invalidateQueries, removeQueries }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}))

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({ refresh, setActiveOrganization }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { error: toastError } }),
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
    setActiveOrganization.mockReset()
    setActiveOrganization.mockResolvedValue(undefined)
    toastError.mockReset()
    useMutationMock.mockReset()
    useMutationMock.mockImplementation((options: unknown) => options)
  })

  it('uses the auth organisation switcher with orgId', async () => {
    const options = getMutationOptions()

    await options.mutationFn('org_2')

    expect(setActiveOrganization).toHaveBeenCalledWith({ organizationId: 'org_2' })
  })

  it('cancels active queries before switching', async () => {
    const options = getMutationOptions()

    await options.onMutate()

    expect(cancelQueries).toHaveBeenCalled()
  })

  it('refreshes organisation-scoped caches on success', async () => {
    const options = getMutationOptions()

    await options.onSuccess({}, 'org_2')

    expect(removeQueries).toHaveBeenCalledWith({ queryKey: queryKeys.projects.detailAll })
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: queryKeys.projectMembers.all })
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: queryKeys.projectSecrets.all })
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: queryKeys.projectTokens.all })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.projects.all })
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
