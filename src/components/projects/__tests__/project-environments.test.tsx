import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ProjectEnvironments } from '../project-environments'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

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
          expiresAt: null,
          createdAt: '2026-07-16T00:00:00.000Z',
        },
        {
          id: 'env_preview',
          projectId: 'project_1',
          name: 'Preview 42',
          slug: 'preview-42',
          color: '#6366f1',
          isDefault: false,
          expiresAt: '2026-07-17T00:00:00.000Z',
          createdAt: '2026-07-16T00:00:00.000Z',
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
  useCreateProjectEnvironment: () => ({ isPending: false, mutateAsync: mocks.create }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }),
}))

describe('ProjectEnvironments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-07-16T00:00:00.000Z').getTime())
    mocks.create.mockResolvedValue({})
  })

  afterEach(() => vi.restoreAllMocks())

  it('lists permanent and expiring environments', () => {
    render(<ProjectEnvironments projectId="project_1" />)

    expect(screen.getByText('Production')).toBeInTheDocument()
    expect(screen.getAllByText('Permanent')).toHaveLength(2)
    expect(screen.getByText('Preview 42')).toBeInTheDocument()
    expect(screen.getByText(/^Expires Jul/)).toBeInTheDocument()
  })

  it('creates a normalized temporary environment', async () => {
    render(<ProjectEnvironments projectId="project_1" />)

    fireEvent.change(screen.getByLabelText('Environment name'), {
      target: { value: 'Pull Request #99' },
    })
    fireEvent.change(screen.getByLabelText('Environment lifetime'), {
      target: { value: '7d' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        name: 'Pull Request #99',
        slug: 'pull-request-99',
        color: '#6366f1',
        expiresAt: '2026-07-23T00:00:00.000Z',
      })
    )
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Environment created.')
  })
})
