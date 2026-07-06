import { renderHook } from '@testing-library/react'

import { queryKeys } from '@/lib/query/keys'

import { useArchiveProject, useUnarchiveProject } from '../use-projects'

const mocks = vi.hoisted(() => ({
  archiveProject: vi.fn(),
  invalidateQueries: vi.fn(),
  unarchiveProject: vi.fn(),
  useMutationMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: unknown) => mocks.useMutationMock(options),
  useQuery: vi.fn(),
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
  }),
}))

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    activeOrganization: {
      organization: {
        id: 'org_123',
      },
    },
    status: 'authenticated',
  }),
}))

vi.mock('@/lib/api/projects', () => ({
  projectsApi: {
    archiveProject: mocks.archiveProject,
    listProjects: vi.fn(),
    unarchiveProject: mocks.unarchiveProject,
  },
}))

function getMutationOptions<T>(hook: () => T): {
  onSuccess?: () => Promise<void>
} {
  renderHook(() => hook())
  return mocks.useMutationMock.mock.calls[0][0] as {
    onSuccess?: () => Promise<void>
  }
}

describe('project archive activity invalidation', () => {
  beforeEach(() => {
    mocks.archiveProject.mockReset()
    mocks.invalidateQueries.mockReset()
    mocks.invalidateQueries.mockResolvedValue(undefined)
    mocks.unarchiveProject.mockReset()
    mocks.useMutationMock.mockReset()
    mocks.useMutationMock.mockImplementation((options: unknown) => options)
  })

  it.each([
    ['archive', useArchiveProject],
    ['unarchive', useUnarchiveProject],
  ])('refreshes project lists and activity after %s succeeds', async (_label, hook) => {
    const options = getMutationOptions(hook)

    await options.onSuccess?.()

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.projects.all })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.organizationActivity.all,
    })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.projectAudit.all })
  })
})
