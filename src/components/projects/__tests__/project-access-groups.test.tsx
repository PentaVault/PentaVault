import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ProjectAccessGroups } from '../project-access-groups'

const mocks = vi.hoisted(() => ({
  grant: vi.fn(),
  revoke: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@/lib/hooks/use-groups', () => ({
  useProjectAccessGroups: () => ({
    data: {
      groups: [
        {
          id: 'group_platform',
          organizationId: 'org_1',
          name: 'Platform',
          slug: 'platform',
          description: null,
          createdByUserId: 'user_owner',
          memberCount: 3,
          projectCount: 1,
          createdAt: '2026-07-16T00:00:00.000Z',
          updatedAt: '2026-07-16T00:00:00.000Z',
        },
      ],
      grants: [
        {
          id: 'grant_1',
          projectId: 'project_1',
          groupId: 'group_platform',
          role: 'readonly',
          grantedByUserId: 'user_owner',
          createdAt: '2026-07-16T00:00:00.000Z',
          updatedAt: '2026-07-16T00:00:00.000Z',
          group: {
            id: 'group_platform',
            organizationId: 'org_1',
            name: 'Platform',
            slug: 'platform',
          },
        },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: mocks.refetch,
  }),
  useGrantProjectAccessGroup: () => ({ isPending: false, mutateAsync: mocks.grant }),
  useRevokeProjectAccessGroup: () => ({ isPending: false, mutateAsync: mocks.revoke }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }),
}))

describe('ProjectAccessGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.revoke.mockResolvedValue({ revoked: true })
  })

  it('shows precise group roles and preserves direct memberships when revoking', async () => {
    render(<ProjectAccessGroups projectId="project_1" />)

    expect(screen.getByText('Platform')).toBeInTheDocument()
    expect(screen.getAllByText('Read only')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Revoke Platform' }))

    await waitFor(() => expect(mocks.revoke).toHaveBeenCalledWith('group_platform'))
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      'Group access revoked. Direct memberships were preserved.'
    )
  })
})
