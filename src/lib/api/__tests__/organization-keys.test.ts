import { apiClient } from '@/lib/api/client'
import { organizationKeysApi } from '@/lib/api/organization-keys'
import { scimApi } from '@/lib/api/scim'

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const key = {
  id: 'key-1',
  organizationId: 'org-1',
  provider: 'aws-kms' as const,
  keyRef: 'arn:aws:kms:eu-west-1:1234:key/acme',
  region: 'eu-west-1',
  endpoint: null,
  active: true,
  rewrapState: 'pending' as const,
  rewrapCompletedAt: null,
  createdByUserId: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}

const scimToken = {
  id: 'token-1',
  organizationId: 'org-1',
  label: 'Okta',
  lastUsedAt: null,
  revokedAt: null,
  createdByUserId: null,
  createdAt: '2026-07-01T00:00:00.000Z',
}

describe('organization encryption key API', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.post).mockReset()
    vi.mocked(apiClient.patch).mockReset()
    vi.mocked(apiClient.delete).mockReset()
  })

  it('lists keys', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { keys: [key] } })
    await expect(organizationKeysApi.list()).resolves.toEqual({ keys: [key] })
    expect(apiClient.get).toHaveBeenCalledWith('/v1/organizations/encryption-keys')
  })

  it('adopts a key', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { key } })
    await organizationKeysApi.adopt({ keyRef: key.keyRef, region: 'eu-west-1' })

    expect(apiClient.post).toHaveBeenCalledWith('/v1/organizations/encryption-keys', {
      keyRef: key.keyRef,
      region: 'eu-west-1',
    })
  })

  it('refuses an empty key reference before calling the API', async () => {
    await expect(organizationKeysApi.adopt({ keyRef: '', region: 'eu-west-1' })).rejects.toThrow()
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('retires a key rather than deleting it', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { key: { ...key, active: false } } })
    await organizationKeysApi.setActive('key-1', false)

    // Deleting would strand every secret still sealed under the key, so the
    // client only ever offers the active flag.
    expect(apiClient.patch).toHaveBeenCalledWith('/v1/organizations/encryption-keys/key-1', {
      active: false,
    })
    expect(apiClient.delete).not.toHaveBeenCalled()
  })

  it('reports re-wrap progress', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { state: 'complete', progress: { scanned: 3, rewrapped: 3, skipped: 0, failed: 0 } },
    })

    await expect(organizationKeysApi.rewrap('key-1')).resolves.toMatchObject({
      state: 'complete',
      progress: { rewrapped: 3 },
    })
    expect(apiClient.post).toHaveBeenCalledWith('/v1/organizations/encryption-keys/key-1/rewrap')
  })
})

describe('SCIM API', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.post).mockReset()
    vi.mocked(apiClient.delete).mockReset()
  })

  it('lists tokens without any secret material', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { tokens: [scimToken] } })

    const { tokens } = await scimApi.list()
    expect(tokens[0]).not.toHaveProperty('tokenHash')
    expect(tokens[0]).not.toHaveProperty('token')
  })

  it('issues a token and returns the plaintext once', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { token: 'pv_scim_abc', scimToken },
    })

    await expect(scimApi.issue('Okta')).resolves.toMatchObject({ token: 'pv_scim_abc' })
    expect(apiClient.post).toHaveBeenCalledWith('/v1/scim/tokens', { label: 'Okta' })
  })

  it('revokes a token', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined })
    await scimApi.revoke('token-1')
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/scim/tokens/token-1')
  })
})
