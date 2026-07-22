import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ProjectDynamicSecrets } from '../project-dynamic-secrets'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  issue: vi.fn(),
  revoke: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  refetch: vi.fn(),
}))

const secret = {
  id: 'dyn_1',
  projectId: 'project_1',
  environmentId: null,
  name: 'db-readonly',
  provider: 'generated',
  config: { prefix: 'sk-', length: 24 },
  defaultTtlSeconds: 3600,
  maxTtlSeconds: 86400,
  enabled: true,
  createdByUserId: 'user_1',
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
} as const

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }),
}))

vi.mock('@/lib/hooks/use-dynamic-secrets', () => ({
  useProjectDynamicSecrets: () => ({
    data: { dynamicSecrets: [secret] },
    isError: false,
    refetch: mocks.refetch,
  }),
  useDynamicSecretLeases: () => ({ data: { leases: [] } }),
  useCreateDynamicSecret: () => ({ isPending: false, mutateAsync: mocks.create }),
  useUpdateDynamicSecret: () => ({ isPending: false, mutateAsync: mocks.update }),
  useDeleteDynamicSecret: () => ({ isPending: false, mutateAsync: mocks.remove }),
  useIssueDynamicSecretLease: () => ({ isPending: false, mutateAsync: mocks.issue }),
  useRevokeDynamicSecretLease: () => ({ isPending: false, mutateAsync: mocks.revoke }),
}))

describe('ProjectDynamicSecrets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({ dynamicSecret: secret })
    mocks.issue.mockResolvedValue({
      lease: {
        id: 'lease_1',
        dynamicSecretId: 'dyn_1',
        projectId: 'project_1',
        status: 'active',
        expiresAt: '2026-07-20T01:00:00.000Z',
        revokedAt: null,
        createdByUserId: 'user_1',
        createdAt: '2026-07-20T00:00:00.000Z',
      },
      credential: 'sk-generated-credential',
    })
  })

  it('lists dynamic secrets with TTL', () => {
    render(<ProjectDynamicSecrets projectId="project_1" />)
    expect(screen.getByText('db-readonly')).toBeInTheDocument()
    expect(screen.getByText('TTL 1h')).toBeInTheDocument()
  })

  it('creates a dynamic secret with generation config', async () => {
    render(<ProjectDynamicSecrets projectId="project_1" />)
    fireEvent.click(screen.getByRole('button', { name: 'New dynamic secret' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'cache-token' } })
    fireEvent.change(screen.getByLabelText('Credential prefix'), { target: { value: 'ct-' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'cache-token',
          config: expect.objectContaining({ prefix: 'ct-' }),
        })
      )
    )
  })

  it('issues a lease and shows the one-time credential', async () => {
    render(<ProjectDynamicSecrets projectId="project_1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Issue lease' }))
    await waitFor(() => expect(mocks.issue).toHaveBeenCalledWith({ dynamicSecretId: 'dyn_1' }))
    expect(await screen.findByText('sk-generated-credential')).toBeInTheDocument()
    expect(screen.getAllByText(/shown only once/).length).toBeGreaterThan(0)
  })
})
