import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { FolderCommit, FolderDiff } from '@/lib/types/api'

import { ProjectFolderHistory } from '../project-folder-history'

const useFolderCommits = vi.fn()
const useFolderDiff = vi.fn()

vi.mock('@/lib/hooks/use-folder-commits', () => ({
  useFolderCommits: (...args: unknown[]) => useFolderCommits(...args),
  useFolderDiff: (...args: unknown[]) => useFolderDiff(...args),
}))

function makeCommit(overrides: Partial<FolderCommit> = {}): FolderCommit {
  return {
    id: 'commit-1',
    projectId: 'project-1',
    configId: null,
    environmentId: null,
    folderPath: '/',
    sequence: 1,
    parentCommitId: null,
    actorUserId: 'user-1',
    message: null,
    changes: [
      {
        secretId: 'secret-1',
        secretName: 'API_KEY',
        operation: 'create',
        previousVersionId: null,
        nextVersionId: 'v1',
      },
    ],
    createdAt: '2026-07-01T10:00:00.000Z',
    ...overrides,
  }
}

const idleDiff = { data: undefined, isPending: false, isError: false, error: null }

describe('ProjectFolderHistory', () => {
  beforeEach(() => {
    useFolderCommits.mockReset()
    useFolderDiff.mockReset()
    useFolderCommits.mockReturnValue({
      data: { commits: [] },
      isPending: false,
      isError: false,
      error: null,
    })
    useFolderDiff.mockReturnValue(idleDiff)
  })

  it('explains an empty history rather than showing nothing', () => {
    render(<ProjectFolderHistory projectId="project-1" />)
    expect(screen.getByText(/No recorded changes in \//)).toBeVisible()
  })

  it('lists commits with a per-secret operation summary', () => {
    useFolderCommits.mockReturnValue({
      data: { commits: [makeCommit()] },
      isPending: false,
      isError: false,
      error: null,
    })
    render(<ProjectFolderHistory projectId="project-1" />)

    expect(screen.getByText('#1')).toBeVisible()
    expect(screen.getByText('create API_KEY')).toBeVisible()
  })

  it('never renders a secret value — the log carries only names', () => {
    useFolderCommits.mockReturnValue({
      data: { commits: [makeCommit()] },
      isPending: false,
      isError: false,
      error: null,
    })
    const { container } = render(<ProjectFolderHistory projectId="project-1" />)

    expect(container.textContent).not.toMatch(/ciphertext|plaintext/i)
  })

  it('only asks for a diff once both endpoints are chosen', async () => {
    useFolderCommits.mockReturnValue({
      data: { commits: [makeCommit(), makeCommit({ id: 'commit-2', sequence: 2 })] },
      isPending: false,
      isError: false,
      error: null,
    })
    render(<ProjectFolderHistory projectId="project-1" />)

    expect(useFolderDiff).toHaveBeenLastCalledWith('project-1', null, null)

    fireEvent.click(screen.getAllByRole('button', { name: 'Compare from' })[0])
    await waitFor(() => {
      expect(useFolderDiff).toHaveBeenLastCalledWith('project-1', 'commit-1', null)
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'Compare to' })[1])
    await waitFor(() => {
      expect(useFolderDiff).toHaveBeenLastCalledWith('project-1', 'commit-1', 'commit-2')
    })
  })

  it('reports a range whose net effect is nothing', () => {
    const diff: FolderDiff = { fromSequence: 1, toSequence: 3, entries: [] }
    useFolderCommits.mockReturnValue({
      data: { commits: [makeCommit(), makeCommit({ id: 'commit-2', sequence: 3 })] },
      isPending: false,
      isError: false,
      error: null,
    })
    useFolderDiff.mockReturnValue({ data: { diff }, isPending: false, isError: false, error: null })

    render(<ProjectFolderHistory projectId="project-1" />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Compare from' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: 'Compare to' })[1])

    expect(screen.getByText(/ended up where they started/)).toBeVisible()
  })

  it('shows the collapsed net change for a range', () => {
    const diff: FolderDiff = {
      fromSequence: 1,
      toSequence: 2,
      entries: [
        {
          secretId: 'secret-1',
          secretName: 'API_KEY',
          operation: 'update',
          fromVersionId: 'v1',
          toVersionId: 'v2',
        },
      ],
    }
    useFolderCommits.mockReturnValue({
      data: { commits: [makeCommit(), makeCommit({ id: 'commit-2', sequence: 2 })] },
      isPending: false,
      isError: false,
      error: null,
    })
    useFolderDiff.mockReturnValue({ data: { diff }, isPending: false, isError: false, error: null })

    render(<ProjectFolderHistory projectId="project-1" />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Compare from' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: 'Compare to' })[1])

    expect(screen.getByText('update API_KEY')).toBeVisible()
  })

  it('clears a comparison when the folder changes', async () => {
    useFolderCommits.mockReturnValue({
      data: { commits: [makeCommit()] },
      isPending: false,
      isError: false,
      error: null,
    })
    render(<ProjectFolderHistory projectId="project-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Compare from' }))
    await waitFor(() => {
      expect(useFolderDiff).toHaveBeenLastCalledWith('project-1', 'commit-1', null)
    })

    // Commit ids belong to one folder, so carrying a selection across would
    // produce a diff of unrelated commits.
    fireEvent.change(document.getElementById('folder-history-path') as HTMLInputElement, {
      target: { value: '/db' },
    })
    await waitFor(() => {
      expect(useFolderDiff).toHaveBeenLastCalledWith('project-1', null, null)
    })
  })

  it('surfaces a load failure instead of an empty history', () => {
    useFolderCommits.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: null,
    })
    render(<ProjectFolderHistory projectId="project-1" />)

    expect(screen.getByText('Unable to load the folder history.')).toBeVisible()
  })
})
