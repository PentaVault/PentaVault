import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ProjectSecretSyncs } from '../project-secret-syncs'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  test: vi.fn(),
  run: vi.fn(),
  retry: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

const sync = {
  id: 'sync_1',
  projectId: 'project_1',
  environmentId: 'env_prod',
  name: 'Production actions',
  provider: 'github',
  destinationConfig: { scope: 'repository', owner: 'acme', repository: 'web' },
  credentialHint: '••••alue',
  credentialConfigured: true,
  folderPath: '/services',
  autoSyncEnabled: true,
  enabled: true,
  maxAttempts: 5,
  lastStatus: 'dead_letter',
  lastSyncedAt: null,
  lastError: 'Upstream provider unavailable',
  createdByUserId: 'user_1',
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
} as const

vi.mock('@/lib/hooks/use-project-configuration', () => ({
  useProjectEnvironments: () => ({
    data: {
      environments: [
        {
          id: 'env_prod',
          projectId: 'project_1',
          name: 'Production',
          slug: 'production',
          color: null,
          isDefault: true,
          createdAt: '2026-07-16T00:00:00.000Z',
        },
      ],
    },
  }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }),
}))

vi.mock('@/lib/hooks/use-secret-syncs', () => ({
  useProjectSecretSyncs: () => ({
    data: { syncs: [sync], supportedProviders: ['github', 'vercel'] },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useSecretSyncDeliveries: () => ({
    data: {
      deliveries: [
        {
          id: 'delivery_1',
          syncId: sync.id,
          projectId: sync.projectId,
          reason: 'automatic',
          status: 'dead_letter',
          attemptCount: 5,
          nextAttemptAt: null,
          lastAttemptAt: sync.createdAt,
          completedAt: null,
          secretCount: 4,
          changedCount: 1,
          lastError: 'Upstream provider unavailable',
          createdAt: sync.createdAt,
          updatedAt: sync.updatedAt,
        },
      ],
    },
    isLoading: false,
  }),
  useCreateSecretSync: () => ({ isPending: false, mutateAsync: mocks.create }),
  useUpdateSecretSync: () => ({ isPending: false, mutateAsync: mocks.update }),
  useDeleteSecretSync: () => ({ isPending: false, mutateAsync: mocks.remove }),
  useTestSecretSync: () => ({ isPending: false, mutateAsync: mocks.test }),
  useRunSecretSync: () => ({ isPending: false, mutateAsync: mocks.run }),
  useRetrySecretSyncDelivery: () => ({ isPending: false, mutateAsync: mocks.retry }),
}))

describe('ProjectSecretSyncs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.test.mockResolvedValue({ ok: true })
    mocks.run.mockResolvedValue({ delivery: { status: 'succeeded' } })
    mocks.retry.mockResolvedValue({ delivery: { status: 'succeeded' } })
    mocks.create.mockResolvedValue({ sync })
  })

  it('shows sanitized scope and supports connection, run, and replay actions', async () => {
    render(<ProjectSecretSyncs projectId="project_1" />)
    expect(screen.getByText('acme/web')).toBeInTheDocument()
    expect(screen.getByText(/token ••••alue/)).toBeInTheDocument()
    expect(screen.queryByText(/provider-token/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Test' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sync now' }))
    await waitFor(() => {
      expect(mocks.test).toHaveBeenCalledWith('sync_1')
      expect(mocks.run).toHaveBeenCalledWith('sync_1')
    })

    fireEvent.click(screen.getByRole('button', { name: /History/ }))
    expect(await screen.findByText(/4 scoped/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }))
    await waitFor(() => expect(mocks.retry).toHaveBeenCalledWith('delivery_1'))
  })

  it('creates a scoped GitHub destination', async () => {
    render(<ProjectSecretSyncs projectId="project_1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Add sync' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Release actions' } })
    fireEvent.change(screen.getByLabelText('Provider access token'), {
      target: { value: 'github_pat_example' },
    })
    fireEvent.change(screen.getByLabelText('GitHub owner'), { target: { value: 'acme' } })
    fireEvent.change(screen.getByLabelText('GitHub repository'), { target: { value: 'release' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Add sync' }).at(-1) as HTMLElement)

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Release actions',
          provider: 'github',
          credential: 'github_pat_example',
          folderPath: '/',
          destinationConfig: {
            scope: 'repository',
            owner: 'acme',
            repository: 'release',
          },
        })
      )
    )
  })
})
