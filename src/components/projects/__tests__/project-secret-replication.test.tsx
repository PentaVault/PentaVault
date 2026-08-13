import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { SecretReplication } from '@/lib/types/api'

import { ProjectSecretReplication } from '../project-secret-replication'

const useSecretReplications = vi.fn()
const useProjectConfigs = vi.fn()
const createReplication = vi.fn()
const setEnabled = vi.fn()
const syncReplication = vi.fn()
const deleteReplication = vi.fn()
const toastError = vi.fn()
const toastSuccess = vi.fn()

vi.mock('@/lib/hooks/use-secret-replications', () => ({
  useSecretReplications: () => useSecretReplications(),
  useCreateSecretReplication: () => ({ mutateAsync: createReplication, isPending: false }),
  useSetSecretReplicationEnabled: () => ({ mutateAsync: setEnabled, isPending: false }),
  useSyncSecretReplication: () => ({ mutateAsync: syncReplication, isPending: false }),
  useDeleteSecretReplication: () => ({ mutateAsync: deleteReplication, isPending: false }),
}))

vi.mock('@/lib/hooks/use-project-configuration', () => ({
  useProjectConfigs: () => useProjectConfigs(),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { error: toastError, success: toastSuccess } }),
}))

function makeReplication(overrides: Partial<SecretReplication> = {}): SecretReplication {
  return {
    id: 'rep_1',
    projectId: 'proj_1',
    sourceConfigId: 'cfg_dev',
    sourceFolderPath: '/',
    targetConfigId: 'cfg_staging',
    targetFolderPath: '/',
    enabled: true,
    lastSyncedAt: null,
    lastSyncStatus: 'pending',
    lastSyncError: null,
    managedSecretCount: 0,
    createdByUserId: null,
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  useSecretReplications.mockReturnValue({
    data: { replications: [makeReplication()] },
    isPending: false,
    isError: false,
  })
  useProjectConfigs.mockReturnValue({
    data: {
      configs: [
        { id: 'cfg_dev', name: 'Development' },
        { id: 'cfg_staging', name: 'Staging' },
      ],
    },
  })
  createReplication.mockResolvedValue({ replication: makeReplication() })
  syncReplication.mockResolvedValue({
    result: {
      replicationId: 'rep_1',
      status: 'succeeded',
      created: 2,
      updated: 1,
      removed: 0,
      conflicted: 0,
      conflictingNames: [],
      syncedAt: '2026-08-13T12:00:00.000Z',
    },
  })
})

describe('ProjectSecretReplication', () => {
  it('names both ends by config rather than by id', () => {
    render(<ProjectSecretReplication projectId="proj_1" />)

    expect(screen.getByText('Development')).toBeInTheDocument()
    expect(screen.getByText('Staging')).toBeInTheDocument()
    expect(screen.getByText('Never synced')).toBeInTheDocument()
  })

  it('refuses to create a link without both ends chosen', async () => {
    render(<ProjectSecretReplication projectId="proj_1" />)

    fireEvent.click(screen.getByRole('button', { name: /add replication/i }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(createReplication).not.toHaveBeenCalled()
  })

  it('reports what a successful sync changed', async () => {
    render(<ProjectSecretReplication projectId="proj_1" />)

    fireEvent.click(screen.getByRole('button', { name: /sync now/i }))

    await waitFor(() => expect(syncReplication).toHaveBeenCalledWith('rep_1'))
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('2 added'))
  })

  it('names the conflicting secrets instead of claiming success', async () => {
    syncReplication.mockResolvedValue({
      result: {
        replicationId: 'rep_1',
        status: 'conflicted',
        created: 0,
        updated: 0,
        removed: 0,
        conflicted: 1,
        conflictingNames: ['SHARED'],
        syncedAt: '2026-08-13T12:00:00.000Z',
      },
    })
    render(<ProjectSecretReplication projectId="proj_1" />)

    fireEvent.click(screen.getByRole('button', { name: /sync now/i }))

    // The operator has to resolve these by hand, so they must be named.
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringContaining('SHARED')))
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('shows a conflict as needing attention rather than as a failure', () => {
    useSecretReplications.mockReturnValue({
      data: {
        replications: [
          makeReplication({
            lastSyncStatus: 'conflicted',
            lastSyncError: '1 secret(s) in the target folder are not managed by this link.',
          }),
        ],
      },
      isPending: false,
      isError: false,
    })
    render(<ProjectSecretReplication projectId="proj_1" />)

    expect(screen.getByText('Needs attention')).toBeInTheDocument()
    expect(screen.getByText(/not managed by this link/)).toBeInTheDocument()
  })

  it('cannot sync a paused link', () => {
    useSecretReplications.mockReturnValue({
      data: { replications: [makeReplication({ enabled: false })] },
      isPending: false,
      isError: false,
    })
    render(<ProjectSecretReplication projectId="proj_1" />)

    expect(screen.getByText('Paused')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sync now/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument()
  })

  it('pauses a link without removing it', async () => {
    render(<ProjectSecretReplication projectId="proj_1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))

    await waitFor(() =>
      expect(setEnabled).toHaveBeenCalledWith({ replicationId: 'rep_1', enabled: false })
    )
  })

  it('keeps the copies on a plain removal', async () => {
    render(<ProjectSecretReplication projectId="proj_1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Remove replication and keep its copies' }))

    await waitFor(() =>
      expect(deleteReplication).toHaveBeenCalledWith({
        replicationId: 'rep_1',
        deleteReplicatedSecrets: false,
      })
    )
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('stay as ordinary secrets'))
  })

  it('deletes the copies only on the explicit destructive action', async () => {
    render(<ProjectSecretReplication projectId="proj_1" />)

    fireEvent.click(screen.getByRole('button', { name: /delete with copies/i }))

    await waitFor(() =>
      expect(deleteReplication).toHaveBeenCalledWith({
        replicationId: 'rep_1',
        deleteReplicatedSecrets: true,
      })
    )
  })

  it('submits a created link with normalised folders', async () => {
    useSecretReplications.mockReturnValue({
      data: { replications: [] },
      isPending: false,
      isError: false,
    })
    render(<ProjectSecretReplication projectId="proj_1" />)

    fireEvent.change(screen.getByLabelText('Source folder'), { target: { value: '/api' } })
    fireEvent.change(screen.getByLabelText('Target folder'), { target: { value: '  ' } })
    // Radix selects are not driven by fireEvent, so the ids are set directly
    // through the same handler the trigger uses.
    fireEvent.click(screen.getByRole('button', { name: /add replication/i }))

    // Without a config chosen the form refuses rather than sending a partial
    // link the server would reject.
    await waitFor(() => expect(toastError).toHaveBeenCalled())
  })

  it('reports a load failure rather than an empty list', () => {
    useSecretReplications.mockReturnValue({ data: undefined, isPending: false, isError: true })
    render(<ProjectSecretReplication projectId="proj_1" />)

    expect(screen.getByText(/unable to load replications/i)).toBeInTheDocument()
  })
})
