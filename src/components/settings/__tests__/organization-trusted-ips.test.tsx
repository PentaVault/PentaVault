import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { OrganizationNetworkPolicyResponse, TrustedIpRule } from '@/lib/types/api'

import { OrganizationTrustedIps } from '../organization-trusted-ips'

const useOrganizationNetworkPolicy = vi.fn()
const setMode = vi.fn()
const addRule = vi.fn()
const updateRule = vi.fn()
const removeRule = vi.fn()
const toastError = vi.fn()
const toastSuccess = vi.fn()

vi.mock('@/lib/hooks/use-network-policy', () => ({
  useOrganizationNetworkPolicy: () => useOrganizationNetworkPolicy(),
  useSetNetworkPolicyMode: () => ({ mutateAsync: setMode, isPending: false }),
  useAddTrustedIpRule: () => ({ mutateAsync: addRule, isPending: false }),
  useUpdateTrustedIpRule: () => ({ mutateAsync: updateRule, isPending: false }),
  useRemoveTrustedIpRule: () => ({ mutateAsync: removeRule, isPending: false }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { error: toastError, success: toastSuccess } }),
}))

function makeRule(overrides: Partial<TrustedIpRule> = {}): TrustedIpRule {
  return {
    id: 'rule-1',
    organizationId: 'org-1',
    cidr: '203.0.113.0/24',
    description: 'London office',
    enabled: true,
    createdByUserId: null,
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
    ...overrides,
  }
}

function makePolicy(
  overrides: Partial<OrganizationNetworkPolicyResponse['policy']> = {},
  requesterIp: string | null = '203.0.113.9'
): OrganizationNetworkPolicyResponse {
  return {
    policy: {
      organizationId: 'org-1',
      mode: 'disabled',
      updatedByUserId: null,
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
      rules: [],
      ...overrides,
    },
    requesterIp,
  }
}

function loaded(response: OrganizationNetworkPolicyResponse) {
  useOrganizationNetworkPolicy.mockReturnValue({
    data: response,
    isError: false,
    isPending: false,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  loaded(makePolicy())
})

describe('OrganizationTrustedIps', () => {
  it('shows a loading state while the policy is in flight', () => {
    useOrganizationNetworkPolicy.mockReturnValue({
      data: undefined,
      isError: false,
      isPending: true,
    })
    render(<OrganizationTrustedIps organizationId="org-1" />)
    expect(screen.getByText(/loading the allowlist/i)).toBeInTheDocument()
  })

  it('reports a failed load rather than an empty allowlist', () => {
    useOrganizationNetworkPolicy.mockReturnValue({
      data: undefined,
      isError: true,
      isPending: false,
    })
    render(<OrganizationTrustedIps organizationId="org-1" />)
    expect(screen.getByText(/unable to load the allowlist/i)).toBeInTheDocument()
  })

  it('explains that an empty enforcing allowlist would admit nobody', () => {
    render(<OrganizationTrustedIps organizationId="org-1" />)
    expect(screen.getByText(/would admit nobody/i)).toBeInTheDocument()
  })

  it('shows the address the server saw, so a lockout is predictable', () => {
    render(<OrganizationTrustedIps organizationId="org-1" />)
    expect(screen.getByText('203.0.113.9')).toBeInTheDocument()
  })

  it('marks the current mode as selected', () => {
    loaded(makePolicy({ mode: 'enforce' }))
    render(<OrganizationTrustedIps organizationId="org-1" />)
    expect(screen.getByRole('radio', { name: /enforce/i })).toBeChecked()
    expect(screen.getByRole('radio', { name: /^off/i })).not.toBeChecked()
  })

  it('changes the mode', async () => {
    setMode.mockResolvedValue(makePolicy({ mode: 'monitor' }))
    render(<OrganizationTrustedIps organizationId="org-1" />)

    fireEvent.click(screen.getByRole('radio', { name: /monitor/i }))

    await waitFor(() => expect(setMode).toHaveBeenCalledWith('monitor'))
    expect(toastSuccess).toHaveBeenCalled()
  })

  it('surfaces a refused mode change instead of pretending it applied', async () => {
    setMode.mockRejectedValue(new Error('would block your own address'))
    render(<OrganizationTrustedIps organizationId="org-1" />)

    fireEvent.click(screen.getByRole('radio', { name: /enforce/i }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('adds a range and clears the form', async () => {
    addRule.mockResolvedValue({ rule: makeRule() })
    render(<OrganizationTrustedIps organizationId="org-1" />)

    const cidrInput = screen.getByLabelText(/ip address or cidr range/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    fireEvent.change(cidrInput, { target: { value: ' 203.0.113.5/24 ' } })
    fireEvent.change(descriptionInput, { target: { value: 'London office' } })
    fireEvent.click(screen.getByRole('button', { name: /add range/i }))

    await waitFor(() =>
      expect(addRule).toHaveBeenCalledWith({
        cidr: '203.0.113.5/24',
        description: 'London office',
      })
    )
    await waitFor(() => expect(cidrInput).toHaveValue(''))
    expect(descriptionInput).toHaveValue('')
  })

  it('does not send an empty range', async () => {
    render(<OrganizationTrustedIps organizationId="org-1" />)
    fireEvent.click(screen.getByRole('button', { name: /add range/i }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(addRule).not.toHaveBeenCalled()
  })

  it('sends a null description when the field is left blank', async () => {
    addRule.mockResolvedValue({ rule: makeRule({ description: null }) })
    render(<OrganizationTrustedIps organizationId="org-1" />)

    fireEvent.change(screen.getByLabelText(/ip address or cidr range/i), {
      target: { value: '10.0.0.0/8' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add range/i }))

    await waitFor(() =>
      expect(addRule).toHaveBeenCalledWith({ cidr: '10.0.0.0/8', description: null })
    )
  })

  it('lists a range with its description', () => {
    loaded(makePolicy({ rules: [makeRule()] }))
    render(<OrganizationTrustedIps organizationId="org-1" />)

    expect(screen.getByText('203.0.113.0/24')).toBeInTheDocument()
    expect(screen.getByText('London office')).toBeInTheDocument()
  })

  it('marks a disabled range so it is not mistaken for an active one', () => {
    loaded(makePolicy({ rules: [makeRule({ enabled: false })] }))
    render(<OrganizationTrustedIps organizationId="org-1" />)

    expect(screen.getByText('Disabled')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^enable$/i })).toBeInTheDocument()
  })

  it('toggles a range', async () => {
    loaded(makePolicy({ rules: [makeRule()] }))
    updateRule.mockResolvedValue({ rule: makeRule({ enabled: false }) })
    render(<OrganizationTrustedIps organizationId="org-1" />)

    fireEvent.click(screen.getByRole('button', { name: /^disable$/i }))

    await waitFor(() =>
      expect(updateRule).toHaveBeenCalledWith({ ruleId: 'rule-1', input: { enabled: false } })
    )
  })

  it('removes a range', async () => {
    loaded(makePolicy({ rules: [makeRule()] }))
    removeRule.mockResolvedValue(undefined)
    render(<OrganizationTrustedIps organizationId="org-1" />)

    fireEvent.click(screen.getByRole('button', { name: /remove 203\.0\.113\.0\/24/i }))

    await waitFor(() => expect(removeRule).toHaveBeenCalledWith('rule-1'))
  })

  it('surfaces a refused removal', async () => {
    loaded(makePolicy({ rules: [makeRule()] }))
    removeRule.mockRejectedValue(new Error('would block your own address'))
    render(<OrganizationTrustedIps organizationId="org-1" />)

    fireEvent.click(screen.getByRole('button', { name: /remove 203\.0\.113\.0\/24/i }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
  })

  it('hides every control from someone who cannot manage the policy', () => {
    loaded(makePolicy({ rules: [makeRule()] }))
    render(<OrganizationTrustedIps canManage={false} organizationId="org-1" />)

    expect(screen.queryByRole('button', { name: /add range/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^disable$/i })).not.toBeInTheDocument()
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled()
    }
  })
})
