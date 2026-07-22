import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { OrganizationAppConnections } from '../organization-app-connections'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  refetch: vi.fn(),
}))

const connection = {
  id: 'apc_1',
  organizationId: 'org_1',
  name: 'github-prod',
  provider: 'github',
  hasCredential: true,
  metadata: { account: 'acme' },
  createdByUserId: 'user_1',
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
} as const

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }),
}))

vi.mock('@/lib/hooks/use-app-connections', () => ({
  useOrganizationAppConnections: () => ({
    data: { connections: [connection] },
    isError: false,
    refetch: mocks.refetch,
  }),
  useCreateAppConnection: () => ({ isPending: false, mutateAsync: mocks.create }),
  useUpdateAppConnection: () => ({ isPending: false, mutateAsync: mocks.update }),
  useDeleteAppConnection: () => ({ isPending: false, mutateAsync: mocks.remove }),
}))

describe('OrganizationAppConnections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({ connection })
    mocks.update.mockResolvedValue({ connection })
    mocks.remove.mockResolvedValue({ deleted: true })
  })

  it('lists existing connections with their provider', () => {
    render(<OrganizationAppConnections organizationId="org_1" />)
    expect(screen.getByText('github-prod')).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
  })

  it('creates a connection with a provider credential', async () => {
    render(<OrganizationAppConnections organizationId="org_1" />)
    fireEvent.click(screen.getByRole('button', { name: 'New connection' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'openai-main' } })
    fireEvent.change(screen.getByLabelText('Personal access token'), {
      target: { value: 'ghp_secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create connection' }))
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'openai-main',
          provider: 'github',
          credential: { token: 'ghp_secret' },
        })
      )
    )
  })

  it('requires credentials when creating', async () => {
    render(<OrganizationAppConnections organizationId="org_1" />)
    fireEvent.click(screen.getByRole('button', { name: 'New connection' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'no-creds' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create connection' }))
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith('Enter the connection credentials.')
    )
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('updates a connection name without requiring a new credential', async () => {
    render(<OrganizationAppConnections organizationId="org_1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit github-prod' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'github-renamed' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith({
        connectionId: 'apc_1',
        input: { name: 'github-renamed' },
      })
    )
  })
})
