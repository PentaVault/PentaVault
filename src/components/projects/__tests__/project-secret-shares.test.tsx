import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ProjectSecretShares } from '../project-secret-shares'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  revoke: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  refetch: vi.fn(),
  resetCreate: vi.fn(),
}))

const share = {
  id: 'share_1',
  projectId: 'project_1',
  organizationId: 'org_1',
  secretId: 'secret_1',
  secretVersionId: 'secret_1:v1',
  secretName: 'STRIPE_KEY',
  name: 'Vendor handoff',
  tokenStart: 'pvs_example1',
  accessScope: 'anyone',
  authorizedEmails: [],
  expiresAt: '2026-07-17T00:00:00.000Z',
  maxViews: 2,
  viewCount: 0,
  remainingViews: 2,
  lastViewedAt: null,
  revokedAt: null,
  revokedByUserId: null,
  createdByUserId: 'user_1',
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
  passwordProtected: true,
  status: 'active',
} as const

vi.mock('@/lib/hooks/use-secret-shares', () => ({
  useProjectSecretShares: () => ({
    data: { shares: [share] },
    isLoading: false,
    isError: false,
    refetch: mocks.refetch,
  }),
  useCreateSecretShare: () => ({
    isPending: false,
    mutateAsync: mocks.create,
    reset: mocks.resetCreate,
  }),
  useRevokeSecretShare: () => ({ isPending: false, mutateAsync: mocks.revoke }),
}))

vi.mock('@/lib/hooks/use-secrets', () => ({
  useProjectSecrets: () => ({
    data: [
      {
        id: 'secret_1',
        name: 'STRIPE_KEY',
        scope: 'project',
      },
    ],
    isLoading: false,
  }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }),
}))

describe('ProjectSecretShares', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({ share, token: `pvs_${'a'.repeat(43)}` })
    mocks.revoke.mockResolvedValue({ share: { ...share, status: 'revoked' } })
  })

  it('lists sanitized share state and revokes active links', async () => {
    render(<ProjectSecretShares projectId="project_1" />)

    expect(screen.getByText('Vendor handoff')).toBeInTheDocument()
    expect(screen.getByText(/2 of 2 views remain/)).toBeInTheDocument()
    expect(screen.queryByText(/pvs_a{10}/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Revoke Vendor handoff' }))
    fireEvent.click(screen.getByRole('button', { name: 'Revoke share' }))
    await waitFor(() => expect(mocks.revoke).toHaveBeenCalledWith('share_1'))
  })

  it('creates a bounded share and shows its full URL once', async () => {
    render(<ProjectSecretShares projectId="project_1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Create share' }))
    fireEvent.change(screen.getByLabelText(/Share name/), {
      target: { value: 'Auditor delivery' },
    })
    fireEvent.change(screen.getByLabelText('Maximum views'), { target: { value: '3' } })
    const createButtons = screen.getAllByRole('button', { name: 'Create share' })
    fireEvent.click(createButtons.at(-1) as HTMLElement)

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          secretId: 'secret_1',
          name: 'Auditor delivery',
          maxViews: 3,
          accessScope: 'anyone',
          authorizedEmails: [],
        })
      )
    )
    expect(await screen.findByText('Copy your one-time share link')).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`/share#pvs_${'a'.repeat(20)}`))).toBeInTheDocument()
    expect(mocks.resetCreate).toHaveBeenCalledTimes(1)
  })
})
