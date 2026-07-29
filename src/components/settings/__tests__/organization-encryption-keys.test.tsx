import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { OrganizationEncryptionKey } from '@/lib/types/api'

import { OrganizationEncryptionKeys } from '../organization-encryption-keys'

const useOrganizationEncryptionKeys = vi.fn()
const adoptMutateAsync = vi.fn()
const setActiveMutateAsync = vi.fn()
const rewrapMutateAsync = vi.fn()
const toastError = vi.fn()
const toastSuccess = vi.fn()

vi.mock('@/lib/hooks/use-organization-keys', () => ({
  useOrganizationEncryptionKeys: () => useOrganizationEncryptionKeys(),
  useAdoptOrganizationEncryptionKey: () => ({
    mutateAsync: adoptMutateAsync,
    isPending: false,
  }),
  useSetOrganizationEncryptionKeyActive: () => ({
    mutateAsync: setActiveMutateAsync,
    isPending: false,
  }),
  useRewrapOrganizationEncryptionKey: () => ({
    mutateAsync: rewrapMutateAsync,
    isPending: false,
  }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { error: toastError, success: toastSuccess } }),
}))

function makeKey(overrides: Partial<OrganizationEncryptionKey> = {}): OrganizationEncryptionKey {
  return {
    id: 'key-1',
    organizationId: 'org-1',
    provider: 'aws-kms',
    keyRef: 'arn:aws:kms:eu-west-1:1234:key/acme',
    region: 'eu-west-1',
    endpoint: null,
    active: true,
    rewrapState: 'pending',
    rewrapCompletedAt: null,
    createdByUserId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('OrganizationEncryptionKeys', () => {
  beforeEach(() => {
    useOrganizationEncryptionKeys.mockReset()
    adoptMutateAsync.mockReset()
    setActiveMutateAsync.mockReset()
    rewrapMutateAsync.mockReset()
    toastError.mockReset()
    toastSuccess.mockReset()
    useOrganizationEncryptionKeys.mockReturnValue({
      data: { keys: [] },
      isPending: false,
      isError: false,
    })
  })

  it('says which key is protecting secrets when none is adopted', () => {
    render(<OrganizationEncryptionKeys />)
    expect(screen.getByText(/wrapped with PentaVault/i)).toBeVisible()
  })

  it('adopts a key', async () => {
    adoptMutateAsync.mockResolvedValue({ key: makeKey() })
    render(<OrganizationEncryptionKeys />)

    fireEvent.change(document.getElementById('org-key-ref') as HTMLInputElement, {
      target: { value: 'arn:aws:kms:eu-west-1:1234:key/acme' },
    })
    fireEvent.change(document.getElementById('org-key-region') as HTMLInputElement, {
      target: { value: 'eu-west-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /adopt key/i }))

    await waitFor(() => {
      expect(adoptMutateAsync).toHaveBeenCalledWith({
        keyRef: 'arn:aws:kms:eu-west-1:1234:key/acme',
        region: 'eu-west-1',
      })
    })
  })

  it('requires both a key and a region before calling the API', async () => {
    render(<OrganizationEncryptionKeys />)

    fireEvent.change(document.getElementById('org-key-ref') as HTMLInputElement, {
      target: { value: 'arn:aws:kms:eu-west-1:1234:key/acme' },
    })
    fireEvent.click(screen.getByRole('button', { name: /adopt key/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/region/i))
    })
    expect(adoptMutateAsync).not.toHaveBeenCalled()
  })

  it('retires a key rather than offering to delete it', () => {
    useOrganizationEncryptionKeys.mockReturnValue({
      data: { keys: [makeKey()] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationEncryptionKeys />)

    // Deleting would strand every secret still sealed under the key.
    expect(screen.getByRole('button', { name: 'Retire' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
  })

  it('explains that a retired key still opens existing secrets', () => {
    useOrganizationEncryptionKeys.mockReturnValue({
      data: { keys: [makeKey({ active: false })] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationEncryptionKeys />)

    expect(screen.getByText(/still opens secrets already sealed/i)).toBeVisible()
    expect(screen.getByText('Retired')).toBeVisible()
  })

  it('toggles a key active state', async () => {
    setActiveMutateAsync.mockResolvedValue({ key: makeKey({ active: false }) })
    useOrganizationEncryptionKeys.mockReturnValue({
      data: { keys: [makeKey()] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationEncryptionKeys />)

    fireEvent.click(screen.getByRole('button', { name: 'Retire' }))

    await waitFor(() => {
      expect(setActiveMutateAsync).toHaveBeenCalledWith({ keyId: 'key-1', active: false })
    })
  })

  it('says existing secrets have not been moved yet', () => {
    useOrganizationEncryptionKeys.mockReturnValue({
      data: { keys: [makeKey({ rewrapState: 'pending' })] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationEncryptionKeys />)

    // Adopting takes effect for new data immediately, so this is a normal
    // resting state rather than an error.
    expect(screen.getByText(/have not been moved onto this key yet/i)).toBeVisible()
  })

  it('moves existing secrets and reports the count', async () => {
    rewrapMutateAsync.mockResolvedValue({
      state: 'complete',
      progress: { scanned: 3, rewrapped: 3, skipped: 0, failed: 0 },
    })
    useOrganizationEncryptionKeys.mockReturnValue({
      data: { keys: [makeKey()] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationEncryptionKeys />)

    fireEvent.click(screen.getByRole('button', { name: /move existing secrets/i }))

    await waitFor(() => {
      expect(rewrapMutateAsync).toHaveBeenCalledWith('key-1')
      expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('3 secrets moved'))
    })
  })

  it('reports a partial move as a failure, not a success', async () => {
    rewrapMutateAsync.mockResolvedValue({
      state: 'failed',
      progress: { scanned: 3, rewrapped: 2, skipped: 0, failed: 1 },
    })
    useOrganizationEncryptionKeys.mockReturnValue({
      data: { keys: [makeKey()] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationEncryptionKeys />)

    fireEvent.click(screen.getByRole('button', { name: /move existing secrets/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        expect.stringContaining('1 secret could not be moved')
      )
    })
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('offers no move for a retired key', () => {
    useOrganizationEncryptionKeys.mockReturnValue({
      data: { keys: [makeKey({ active: false })] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationEncryptionKeys />)

    // Moving secrets onto a key that no longer takes new writes would be
    // moving them somewhere they are about to leave.
    expect(screen.queryByRole('button', { name: /move existing secrets/i })).toBeNull()
  })

  it('reports a failed adoption without clearing what was typed', async () => {
    adoptMutateAsync.mockRejectedValue(new Error('unusable'))
    render(<OrganizationEncryptionKeys />)

    fireEvent.change(document.getElementById('org-key-ref') as HTMLInputElement, {
      target: { value: 'arn:aws:kms:eu-west-1:1234:key/acme' },
    })
    fireEvent.change(document.getElementById('org-key-region') as HTMLInputElement, {
      target: { value: 'eu-west-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /adopt key/i }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    // Retyping an ARN after a typo elsewhere would be needless.
    expect((document.getElementById('org-key-ref') as HTMLInputElement).value).toBe(
      'arn:aws:kms:eu-west-1:1234:key/acme'
    )
  })

  it('requires a key ARN as well as a region', async () => {
    render(<OrganizationEncryptionKeys />)

    fireEvent.change(document.getElementById('org-key-region') as HTMLInputElement, {
      target: { value: 'eu-west-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /adopt key/i }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(adoptMutateAsync).not.toHaveBeenCalled()
  })

  it('makes a retired key active again', async () => {
    setActiveMutateAsync.mockResolvedValue({ key: makeKey() })
    useOrganizationEncryptionKeys.mockReturnValue({
      data: { keys: [makeKey({ active: false })] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationEncryptionKeys />)

    fireEvent.click(screen.getByRole('button', { name: 'Make active' }))
    await waitFor(() => {
      expect(setActiveMutateAsync).toHaveBeenCalledWith({ keyId: 'key-1', active: true })
    })
  })

  it('reports a failed move without claiming success', async () => {
    rewrapMutateAsync.mockRejectedValue(new Error('boom'))
    useOrganizationEncryptionKeys.mockReturnValue({
      data: { keys: [makeKey()] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationEncryptionKeys />)

    fireEvent.click(screen.getByRole('button', { name: /move existing secrets/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('mentions records that were already on the key', async () => {
    rewrapMutateAsync.mockResolvedValue({
      state: 'complete',
      progress: { scanned: 5, rewrapped: 2, skipped: 3, failed: 0 },
    })
    useOrganizationEncryptionKeys.mockReturnValue({
      data: { keys: [makeKey()] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationEncryptionKeys />)

    fireEvent.click(screen.getByRole('button', { name: /move existing secrets/i }))
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('3 already there'))
    })
  })

  it('describes a completed move', () => {
    useOrganizationEncryptionKeys.mockReturnValue({
      data: { keys: [makeKey({ rewrapState: 'complete' })] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationEncryptionKeys />)

    expect(screen.getByText(/All existing secrets have been moved/i)).toBeVisible()
  })

  it('surfaces a load failure rather than implying no key is set', () => {
    useOrganizationEncryptionKeys.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    })
    render(<OrganizationEncryptionKeys />)

    expect(screen.getByText('Unable to load encryption keys.')).toBeVisible()
  })
})
