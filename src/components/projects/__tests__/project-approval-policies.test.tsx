import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { ApprovalPolicy } from '@/lib/types/api'

import { ProjectApprovalPolicies } from '../project-approval-policies'

const useProjectApprovalPolicies = vi.fn()
const createMutateAsync = vi.fn()
const updateMutateAsync = vi.fn()
const deleteMutateAsync = vi.fn()
const toastError = vi.fn()
const toastSuccess = vi.fn()

vi.mock('@/lib/hooks/use-approval-policies', () => ({
  useProjectApprovalPolicies: () => useProjectApprovalPolicies(),
  useCreateApprovalPolicy: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateApprovalPolicy: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
  useDeleteApprovalPolicy: () => ({ mutateAsync: deleteMutateAsync, isPending: false }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { error: toastError, success: toastSuccess } }),
}))

function makePolicy(overrides: Partial<ApprovalPolicy> = {}): ApprovalPolicy {
  return {
    id: 'policy-1',
    projectId: 'project-1',
    name: 'Production changes',
    scope: 'secret_change',
    environmentId: null,
    secretPath: '/production',
    requiredApprovals: 2,
    approverUserIds: [],
    approverGroupIds: [],
    allowSelfApproval: false,
    enabled: true,
    createdByUserId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('ProjectApprovalPolicies', () => {
  beforeEach(() => {
    useProjectApprovalPolicies.mockReset()
    createMutateAsync.mockReset()
    updateMutateAsync.mockReset()
    deleteMutateAsync.mockReset()
    toastError.mockReset()
    toastSuccess.mockReset()
    useProjectApprovalPolicies.mockReturnValue({
      data: { policies: [] },
      isPending: false,
      isError: false,
    })
  })

  it('explains the fallback when no policies exist', () => {
    render(<ProjectApprovalPolicies projectId="project-1" />)
    expect(screen.getByText(/default approval quorum/)).toBeInTheDocument()
  })

  it('renders a policy with its path and quorum', () => {
    useProjectApprovalPolicies.mockReturnValue({
      data: { policies: [makePolicy()] },
      isPending: false,
      isError: false,
    })
    render(<ProjectApprovalPolicies projectId="project-1" />)

    expect(screen.getByText('Production changes')).toBeInTheDocument()
    expect(screen.getByText('/production')).toBeInTheDocument()
    expect(screen.getByText('2 approvals')).toBeInTheDocument()
  })

  it('flags a policy that permits self-approval', () => {
    useProjectApprovalPolicies.mockReturnValue({
      data: { policies: [makePolicy({ allowSelfApproval: true })] },
      isPending: false,
      isError: false,
    })
    render(<ProjectApprovalPolicies projectId="project-1" />)

    // Removing separation of duties should be visible at a glance.
    expect(screen.getByText('Self-approval allowed')).toBeInTheDocument()
  })

  it('says when any eligible reviewer may approve', () => {
    useProjectApprovalPolicies.mockReturnValue({
      data: { policies: [makePolicy()] },
      isPending: false,
      isError: false,
    })
    render(<ProjectApprovalPolicies projectId="project-1" />)
    expect(screen.getByText(/any eligible reviewer/)).toBeInTheDocument()
  })

  it('counts named approvers', () => {
    useProjectApprovalPolicies.mockReturnValue({
      data: {
        policies: [makePolicy({ approverUserIds: ['u1', 'u2'], approverGroupIds: ['g1'] })],
      },
      isPending: false,
      isError: false,
    })
    render(<ProjectApprovalPolicies projectId="project-1" />)
    expect(screen.getByText(/3 named approvers/)).toBeInTheDocument()
  })

  it('creates a policy with the entered values', async () => {
    createMutateAsync.mockResolvedValue({ policy: makePolicy() })
    render(<ProjectApprovalPolicies projectId="project-1" />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Prod' } })
    fireEvent.change(screen.getByLabelText('Path'), { target: { value: '/prod' } })
    fireEvent.change(screen.getByLabelText('Approvals'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /Add policy/ }))

    await waitFor(() =>
      expect(createMutateAsync).toHaveBeenCalledWith({
        name: 'Prod',
        secretPath: '/prod',
        requiredApprovals: 3,
      })
    )
  })

  it('refuses to submit without a name', async () => {
    render(<ProjectApprovalPolicies projectId="project-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Add policy/ }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(createMutateAsync).not.toHaveBeenCalled()
  })

  it('rejects an out-of-range quorum before calling the API', async () => {
    render(<ProjectApprovalPolicies projectId="project-1" />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Prod' } })
    fireEvent.change(screen.getByLabelText('Approvals'), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: /Add policy/ }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(createMutateAsync).not.toHaveBeenCalled()
  })

  it('toggles a policy between enabled and disabled', async () => {
    useProjectApprovalPolicies.mockReturnValue({
      data: { policies: [makePolicy({ enabled: true })] },
      isPending: false,
      isError: false,
    })
    updateMutateAsync.mockResolvedValue({ policy: makePolicy({ enabled: false }) })
    render(<ProjectApprovalPolicies projectId="project-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Disable' }))

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        policyId: 'policy-1',
        input: { enabled: false },
      })
    )
  })

  it('deletes a policy', async () => {
    useProjectApprovalPolicies.mockReturnValue({
      data: { policies: [makePolicy()] },
      isPending: false,
      isError: false,
    })
    deleteMutateAsync.mockResolvedValue(undefined)
    render(<ProjectApprovalPolicies projectId="project-1" />)

    fireEvent.click(screen.getByRole('button', { name: /Delete policy/ }))

    await waitFor(() => expect(deleteMutateAsync).toHaveBeenCalledWith('policy-1'))
  })

  it('explains that policies need admin access when the request fails', () => {
    useProjectApprovalPolicies.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    })
    render(<ProjectApprovalPolicies projectId="project-1" />)

    expect(screen.getByText(/require project admin access/)).toBeInTheDocument()
  })
})
