import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ProjectSecretSnapshots } from '../project-secret-snapshots'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  restore: vi.fn(),
  remove: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  refetch: vi.fn(),
}))

const snapshot = {
  id: 'snap_1',
  projectId: 'project_1',
  configId: 'config_1',
  environmentId: 'env_prod',
  folderPath: '/',
  label: 'before rotation',
  entries: [{ secretId: 'secret_a', versionId: 'secret_a:v1', name: 'A' }],
  secretCount: 1,
  createdByUserId: 'user_1',
  createdAt: '2026-07-16T00:00:00.000Z',
} as const

vi.mock('@/lib/hooks/use-project-configuration', () => ({
  useProjectConfigs: () => ({
    data: {
      configs: [
        {
          id: 'config_1',
          projectId: 'project_1',
          environmentId: 'env_prod',
          parentConfigId: null,
          type: 'root',
          name: 'Production',
          slug: 'production',
          isProtected: false,
        },
      ],
    },
  }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }),
}))

vi.mock('@/lib/hooks/use-secret-snapshots', () => ({
  useProjectSecretSnapshots: () => ({
    data: { snapshots: [snapshot] },
    isError: false,
    refetch: mocks.refetch,
  }),
  useCreateSecretSnapshot: () => ({ isPending: false, mutateAsync: mocks.create }),
  useRestoreSecretSnapshot: () => ({ isPending: false, mutateAsync: mocks.restore }),
  useDeleteSecretSnapshot: () => ({ isPending: false, mutateAsync: mocks.remove }),
}))

describe('ProjectSecretSnapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({ snapshot })
    mocks.restore.mockResolvedValue({ restored: 1, skipped: [] })
    mocks.remove.mockResolvedValue({ deleted: true })
  })

  it('lists existing snapshots with their secret count', () => {
    render(<ProjectSecretSnapshots projectId="project_1" />)
    expect(screen.getByText('before rotation')).toBeInTheDocument()
    expect(screen.getByText('1 secrets')).toBeInTheDocument()
  })

  it('captures a snapshot for the selected config', async () => {
    render(<ProjectSecretSnapshots projectId="project_1" />)
    fireEvent.change(screen.getByLabelText('Label (optional)'), {
      target: { value: 'pre-deploy' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({ configId: 'config_1', label: 'pre-deploy' })
      )
    )
  })

  it('restores a snapshot after confirmation', async () => {
    render(<ProjectSecretSnapshots projectId="project_1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(mocks.restore).toHaveBeenCalledWith('snap_1'))
  })
})
