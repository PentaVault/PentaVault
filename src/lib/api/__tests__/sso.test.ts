import { apiClient } from '@/lib/api/client'
import { ssoApi } from '@/lib/api/sso'

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const oidcConnection = {
  id: 'sso-1',
  organizationId: 'org-1',
  provider: 'oidc' as const,
  label: 'Acme Okta',
  issuer: 'https://acme.okta.com',
  jwksUri: 'https://acme.okta.com/oauth2/v1/keys',
  clientId: '0oa1b2c3d4',
  authorizationEndpoint: 'https://acme.okta.com/oauth2/v1/authorize',
  tokenEndpoint: 'https://acme.okta.com/oauth2/v1/token',
  allowedEmailDomains: ['acme.com'],
  justInTimeProvisioning: false,
  emailClaim: 'email',
  nameClaim: 'name',
  enabled: true,
  createdByUserId: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}

const samlConnection = {
  ...oidcConnection,
  id: 'sso-2',
  provider: 'saml' as const,
  entryPoint: 'https://acme.okta.com/app/acme/sso/saml',
  idpCert: '-----BEGIN CERTIFICATE-----MIIB-----END CERTIFICATE-----',
  spEntityId: 'https://acme.com/sp',
  issuer: undefined,
  jwksUri: undefined,
  clientId: undefined,
  authorizationEndpoint: undefined,
  tokenEndpoint: undefined,
}

describe('SSO API', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.post).mockReset()
    vi.mocked(apiClient.patch).mockReset()
    vi.mocked(apiClient.delete).mockReset()
  })

  it('discovers connections for an email without sending anything else', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { connections: [{ id: 'sso-1', label: 'Acme Okta' }] },
    })

    await expect(ssoApi.discover('ada@acme.com')).resolves.toEqual({
      connections: [{ id: 'sso-1', label: 'Acme Okta' }],
    })
    expect(apiClient.post).toHaveBeenCalledWith('/v1/sso/discover', { email: 'ada@acme.com' })
  })

  it('parses both protocols out of a connection list', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { connections: [oidcConnection, samlConnection] },
    })

    const { connections } = await ssoApi.list()
    expect(connections.map((connection) => connection.provider)).toEqual(['oidc', 'saml'])
  })

  it('rejects a response whose protocol fields do not match its provider', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      // A SAML connection missing its entry point is not a shape any code path
      // can safely use, so it must not be handed onward.
      data: { connections: [{ ...samlConnection, entryPoint: undefined }] },
    })

    await expect(ssoApi.list()).rejects.toThrow()
  })

  it('sends an OIDC connection as-is', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { connection: oidcConnection } })

    await ssoApi.create({
      label: 'Acme Okta',
      issuer: 'https://acme.okta.com',
      jwksUri: 'https://acme.okta.com/oauth2/v1/keys',
      clientId: '0oa1b2c3d4',
      authorizationEndpoint: 'https://acme.okta.com/oauth2/v1/authorize',
      tokenEndpoint: 'https://acme.okta.com/oauth2/v1/token',
      allowedEmailDomains: ['acme.com'],
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/sso/connections',
      expect.objectContaining({ issuer: 'https://acme.okta.com' })
    )
  })

  it('refuses to send a plaintext endpoint', async () => {
    // The backend refuses it too; failing here turns a 400 into an inline error.
    await expect(
      ssoApi.create({
        label: 'Acme Okta',
        issuer: 'http://acme.okta.com',
        jwksUri: 'https://acme.okta.com/oauth2/v1/keys',
        clientId: '0oa1b2c3d4',
        authorizationEndpoint: 'https://acme.okta.com/oauth2/v1/authorize',
        tokenEndpoint: 'https://acme.okta.com/oauth2/v1/token',
        allowedEmailDomains: ['acme.com'],
      })
    ).rejects.toThrow()
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('refuses to send an empty domain allowlist', async () => {
    await expect(
      ssoApi.create({
        provider: 'saml',
        label: 'Acme ADFS',
        entryPoint: 'https://acme.okta.com/app/acme/sso/saml',
        idpCert: 'MIIB',
        spEntityId: 'https://acme.com/sp',
        allowedEmailDomains: [],
      })
    ).rejects.toThrow()
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('updates a connection', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({
      data: { connection: { ...oidcConnection, enabled: false } },
    })

    await expect(ssoApi.update('sso-1', { enabled: false })).resolves.toMatchObject({
      connection: { enabled: false },
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/v1/sso/connections/sso-1', { enabled: false })
  })

  it('removes a connection', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined })
    await ssoApi.remove('sso-1')
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/sso/connections/sso-1')
  })

  it('verifies a connection against a real assertion', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        decision: {
          subject: 'idp-user-1',
          email: 'ada@acme.com',
          name: 'Ada',
          organizationId: 'org-1',
          shouldProvision: false,
        },
      },
    })

    await expect(
      ssoApi.verify('sso-1', { idToken: 'a.b.c', nonce: 'nonce-1' })
    ).resolves.toMatchObject({ decision: { email: 'ada@acme.com' } })
    expect(apiClient.post).toHaveBeenCalledWith('/v1/sso/connections/sso-1/verify', {
      idToken: 'a.b.c',
      nonce: 'nonce-1',
    })
  })
})
