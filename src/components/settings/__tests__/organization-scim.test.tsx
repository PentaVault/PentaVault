import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { ScimToken } from '@/lib/types/api'

import { OrganizationScim } from '../organization-scim'

const useScimTokens = vi.fn()
const issueMutateAsync = vi.fn()
const revokeMutateAsync = vi.fn()
const toastError = vi.fn()
const toastSuccess = vi.fn()
const writeText = vi.fn()

vi.mock('@/lib/hooks/use-scim', () => ({
  useScimTokens: () => useScimTokens(),
  useIssueScimToken: () => ({ mutateAsync: issueMutateAsync, isPending: false }),
  useRevokeScimToken: () => ({ mutateAsync: revokeMutateAsync, isPending: false }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { error: toastError, success: toastSuccess } }),
}))

vi.mock('@/lib/env', () => ({ env: { apiUrl: 'https://api.pentavault.test' } }))

function makeToken(overrides: Partial<ScimToken> = {}): ScimToken {
  return {
    id: 'token-1',
    organizationId: 'org-1',
    label: 'Okta production',
    lastUsedAt: null,
    revokedAt: null,
    createdByUserId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('OrganizationScim', () => {
  beforeEach(() => {
    useScimTokens.mockReset()
    issueMutateAsync.mockReset()
    revokeMutateAsync.mockReset()
    toastError.mockReset()
    toastSuccess.mockReset()
    writeText.mockReset()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    useScimTokens.mockReturnValue({ data: { tokens: [] }, isPending: false, isError: false })
  })

  it('shows the SCIM base URL an admin has to paste into their provider', () => {
    render(<OrganizationScim />)
    expect(screen.getByText('https://api.pentavault.test/scim/v2')).toBeVisible()
  })

  it('explains that members are managed by hand when nothing is configured', () => {
    render(<OrganizationScim />)
    expect(screen.getByText(/added and removed by hand/i)).toBeVisible()
  })

  it('requires a name so directories can be told apart', async () => {
    render(<OrganizationScim />)
    fireEvent.click(screen.getByRole('button', { name: /issue token/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/name/i))
    })
    expect(issueMutateAsync).not.toHaveBeenCalled()
  })

  it('shows the plaintext token once with a warning that it cannot be shown again', async () => {
    issueMutateAsync.mockResolvedValue({
      token: 'pv_scim_abc123',
      scimToken: makeToken(),
    })
    render(<OrganizationScim />)

    fireEvent.change(document.getElementById('scim-token-label') as HTMLInputElement, {
      target: { value: 'Okta production' },
    })
    fireEvent.click(screen.getByRole('button', { name: /issue token/i }))

    await waitFor(() => {
      expect(screen.getByText('pv_scim_abc123')).toBeVisible()
    })
    expect(screen.getByText(/cannot show it again/i)).toBeVisible()
  })

  it('copies the issued token', async () => {
    writeText.mockResolvedValue(undefined)
    issueMutateAsync.mockResolvedValue({ token: 'pv_scim_abc123', scimToken: makeToken() })
    render(<OrganizationScim />)

    fireEvent.change(document.getElementById('scim-token-label') as HTMLInputElement, {
      target: { value: 'Okta' },
    })
    fireEvent.click(screen.getByRole('button', { name: /issue token/i }))
    await waitFor(() => expect(screen.getByText('pv_scim_abc123')).toBeVisible())

    fireEvent.click(screen.getByRole('button', { name: /copy/i }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('pv_scim_abc123'))
  })

  it('does not keep showing the token after dismissal', async () => {
    issueMutateAsync.mockResolvedValue({ token: 'pv_scim_abc123', scimToken: makeToken() })
    render(<OrganizationScim />)

    fireEvent.change(document.getElementById('scim-token-label') as HTMLInputElement, {
      target: { value: 'Okta' },
    })
    fireEvent.click(screen.getByRole('button', { name: /issue token/i }))
    await waitFor(() => expect(screen.getByText('pv_scim_abc123')).toBeVisible())

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByText('pv_scim_abc123')).toBeNull()
  })

  it('revokes a token', async () => {
    revokeMutateAsync.mockResolvedValue(undefined)
    useScimTokens.mockReturnValue({
      data: { tokens: [makeToken()] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationScim />)

    fireEvent.click(screen.getByRole('button', { name: /revoke token Okta production/i }))
    await waitFor(() => expect(revokeMutateAsync).toHaveBeenCalledWith('token-1'))
  })

  it('offers no revoke for an already revoked token', () => {
    useScimTokens.mockReturnValue({
      data: { tokens: [makeToken({ revokedAt: '2026-07-02T00:00:00.000Z' })] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationScim />)

    expect(screen.getByText('Revoked')).toBeVisible()
    expect(screen.queryByRole('button', { name: /revoke token/i })).toBeNull()
  })

  it('surfaces a load failure rather than implying no sync is configured', () => {
    useScimTokens.mockReturnValue({ data: undefined, isPending: false, isError: true })
    render(<OrganizationScim />)

    expect(screen.getByText('Unable to load SCIM tokens.')).toBeVisible()
  })
})
