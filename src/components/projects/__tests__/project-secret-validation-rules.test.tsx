import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ProjectSecretValidationRules } from '../project-secret-validation-rules'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  refetch: vi.fn(),
}))

const rule = {
  id: 'svr_1',
  projectId: 'project_1',
  name: 'prod-api-keys',
  environmentId: 'env_prod',
  folderPath: '/api',
  namePattern: '^API_',
  constraints: [{ type: 'min_length', value: 20 }, { type: 'disallow_whitespace' }],
  enabled: true,
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

vi.mock('@/lib/hooks/use-secret-validation-rules', () => ({
  useProjectSecretValidationRules: () => ({
    data: { rules: [rule] },
    isLoading: false,
    isError: false,
    refetch: mocks.refetch,
  }),
  useCreateSecretValidationRule: () => ({ isPending: false, mutateAsync: mocks.create }),
  useUpdateSecretValidationRule: () => ({ isPending: false, mutateAsync: mocks.update }),
  useDeleteSecretValidationRule: () => ({ isPending: false, mutateAsync: mocks.remove }),
}))

describe('ProjectSecretValidationRules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({ rule })
    mocks.update.mockResolvedValue({ rule })
    mocks.remove.mockResolvedValue({ deleted: true })
  })

  it('renders existing rules with their scope and constraints', () => {
    render(<ProjectSecretValidationRules projectId="project_1" />)

    expect(screen.getByText('prod-api-keys')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText(/Production · \/api/)).toBeInTheDocument()
    expect(screen.getByText('min 20 chars')).toBeInTheDocument()
    expect(screen.getByText('no whitespace')).toBeInTheDocument()
  })

  it('toggles a rule enabled state', async () => {
    render(<ProjectSecretValidationRules projectId="project_1" />)
    fireEvent.click(screen.getByRole('switch', { name: 'Toggle prod-api-keys' }))
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith({
        ruleId: 'svr_1',
        input: { enabled: false },
      })
    )
  })

  it('creates a new rule with the entered constraints', async () => {
    render(<ProjectSecretValidationRules projectId="project_1" />)
    fireEvent.click(screen.getByRole('button', { name: 'New rule' }))
    fireEvent.change(screen.getByLabelText('Rule name'), {
      target: { value: 'staging-tokens' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create rule' }))

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'staging-tokens',
          folderPath: '/',
          environmentId: null,
          constraints: [{ type: 'min_length', value: 8 }],
        })
      )
    )
  })

  it('requires a rule name before submitting', async () => {
    render(<ProjectSecretValidationRules projectId="project_1" />)
    fireEvent.click(screen.getByRole('button', { name: 'New rule' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create rule' }))

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('A rule name is required.'))
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
