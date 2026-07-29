import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { OidcSsoConnection, SamlSsoConnection, SsoConnection } from '@/lib/types/api'

import { OrganizationSso } from '../organization-sso'

const useSsoConnections = vi.fn()
const createMutateAsync = vi.fn()
const updateMutateAsync = vi.fn()
const deleteMutateAsync = vi.fn()
const verifyMutateAsync = vi.fn()
const toastError = vi.fn()
const toastSuccess = vi.fn()

vi.mock('@/lib/hooks/use-sso', () => ({
  useSsoConnections: () => useSsoConnections(),
  useCreateSsoConnection: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateSsoConnection: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
  useDeleteSsoConnection: () => ({ mutateAsync: deleteMutateAsync, isPending: false }),
  useVerifySsoConnection: () => ({ mutateAsync: verifyMutateAsync, isPending: false }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { error: toastError, success: toastSuccess } }),
}))

function makeConnection(overrides: Partial<OidcSsoConnection> = {}): SsoConnection {
  return {
    id: 'sso-1',
    organizationId: 'org-1',
    provider: 'oidc',
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
    ...overrides,
  }
}

function makeSamlConnection(overrides: Partial<SamlSsoConnection> = {}): SsoConnection {
  return {
    id: 'sso-saml',
    organizationId: 'org-1',
    provider: 'saml',
    label: 'Acme ADFS',
    entryPoint: 'https://acme.okta.com/app/acme/sso/saml',
    idpCert: '-----BEGIN CERTIFICATE-----MIIB-----END CERTIFICATE-----',
    spEntityId: 'https://acme.com/sp',
    allowedEmailDomains: ['acme.com'],
    justInTimeProvisioning: false,
    emailClaim: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    nameClaim: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
    enabled: true,
    createdByUserId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function fillDraft(overrides: Record<string, string> = {}, replaceAll?: Record<string, string>) {
  const values: Record<string, string> = replaceAll ?? {
    'new-sso-label': 'Acme Okta',
    'new-sso-issuer': 'https://acme.okta.com',
    'new-sso-jwksUri': 'https://acme.okta.com/oauth2/v1/keys',
    'new-sso-clientId': '0oa1b2c3d4',
    'new-sso-authorizationEndpoint': 'https://acme.okta.com/oauth2/v1/authorize',
    'new-sso-tokenEndpoint': 'https://acme.okta.com/oauth2/v1/token',
    'new-sso-allowedEmailDomains': 'acme.com',
    ...overrides,
  }

  for (const [id, value] of Object.entries(values)) {
    const input = document.getElementById(id) as HTMLInputElement
    fireEvent.change(input, { target: { value } })
  }
}

describe('OrganizationSso', () => {
  beforeEach(() => {
    useSsoConnections.mockReset()
    createMutateAsync.mockReset()
    updateMutateAsync.mockReset()
    deleteMutateAsync.mockReset()
    verifyMutateAsync.mockReset()
    toastError.mockReset()
    toastSuccess.mockReset()
    useSsoConnections.mockReturnValue({
      data: { connections: [] },
      isPending: false,
      isError: false,
    })
  })

  it('says what happens when no connection is configured', () => {
    render(<OrganizationSso />)
    expect(screen.getByText(/continue to sign in with their PentaVault credentials/i)).toBeVisible()
  })

  it('creates a connection from the draft form', async () => {
    createMutateAsync.mockResolvedValue({ connection: makeConnection() })
    render(<OrganizationSso />)

    fillDraft()
    fireEvent.click(screen.getByRole('button', { name: /add connection/i }))

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Acme Okta',
          issuer: 'https://acme.okta.com',
          allowedEmailDomains: ['acme.com'],
        })
      )
    })
  })

  it('refuses to submit a connection with no allowed email domain', async () => {
    render(<OrganizationSso />)

    fillDraft({ 'new-sso-allowedEmailDomains': '   ' })
    fireEvent.click(screen.getByRole('button', { name: /add connection/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/allowed email domain/i))
    })
    // An empty allowlist would admit every user of the identity provider, so
    // the request must never reach the API.
    expect(createMutateAsync).not.toHaveBeenCalled()
  })

  it('splits and normalises several domains', async () => {
    createMutateAsync.mockResolvedValue({ connection: makeConnection() })
    render(<OrganizationSso />)

    fillDraft({ 'new-sso-allowedEmailDomains': '@ACME.com, sub.acme.com  contractors.acme.com' })
    fireEvent.click(screen.getByRole('button', { name: /add connection/i }))

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          allowedEmailDomains: ['acme.com', 'sub.acme.com', 'contractors.acme.com'],
        })
      )
    })
  })

  it('shows which domains a connection accepts', () => {
    useSsoConnections.mockReturnValue({
      data: { connections: [makeConnection({ allowedEmailDomains: ['acme.com', 'acme.dev'] })] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationSso />)

    expect(screen.getByText(/@acme\.com, @acme\.dev/)).toBeVisible()
  })

  it('flags a connection that provisions accounts automatically', () => {
    useSsoConnections.mockReturnValue({
      data: { connections: [makeConnection({ justInTimeProvisioning: true })] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationSso />)

    expect(screen.getByText('Auto-provisioning')).toBeVisible()
  })

  it('disables a connection', async () => {
    updateMutateAsync.mockResolvedValue({ connection: makeConnection({ enabled: false }) })
    useSsoConnections.mockReturnValue({
      data: { connections: [makeConnection()] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationSso />)

    fireEvent.click(screen.getByRole('button', { name: 'Disable' }))

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        connectionId: 'sso-1',
        input: { enabled: false },
      })
    })
  })

  it('reports a verified assertion', async () => {
    verifyMutateAsync.mockResolvedValue({
      decision: {
        subject: 'idp-user-1',
        email: 'ada@acme.com',
        name: 'Ada',
        organizationId: 'org-1',
        shouldProvision: false,
      },
    })
    useSsoConnections.mockReturnValue({
      data: { connections: [makeConnection()] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationSso />)

    fireEvent.click(screen.getByRole('button', { name: 'Test' }))
    fireEvent.change(document.getElementById('sso-id-token-sso-1') as HTMLInputElement, {
      target: { value: 'eyJhbGciOiJSUzI1NiJ9.e30.sig' },
    })
    fireEvent.change(document.getElementById('sso-nonce-sso-1') as HTMLInputElement, {
      target: { value: 'nonce-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('ada@acme.com'))
    })
  })

  it('requires both an ID token and a nonce before verifying', async () => {
    useSsoConnections.mockReturnValue({
      data: { connections: [makeConnection()] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationSso />)

    fireEvent.click(screen.getByRole('button', { name: 'Test' }))
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/nonce/i))
    })
    expect(verifyMutateAsync).not.toHaveBeenCalled()
  })

  it('creates a SAML connection when that protocol is chosen', async () => {
    createMutateAsync.mockResolvedValue({ connection: makeSamlConnection() })
    render(<OrganizationSso />)

    fireEvent.click(screen.getByRole('button', { name: 'SAML' }))
    fillDraft(
      {},
      {
        'new-sso-label': 'Acme ADFS',
        'new-sso-entryPoint': 'https://acme.okta.com/app/acme/sso/saml',
        'new-sso-spEntityId': 'https://acme.com/sp',
        'new-sso-idpCert': '-----BEGIN CERTIFICATE-----MIIB-----END CERTIFICATE-----',
        'new-sso-allowedEmailDomains': 'acme.com',
      }
    )
    fireEvent.click(screen.getByRole('button', { name: /add connection/i }))

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'saml',
          entryPoint: 'https://acme.okta.com/app/acme/sso/saml',
          spEntityId: 'https://acme.com/sp',
        })
      )
    })
    // OIDC fields must not ride along on a SAML connection.
    expect(createMutateAsync.mock.calls[0][0]).not.toHaveProperty('issuer')
  })

  it('swaps the form fields when the protocol changes', () => {
    render(<OrganizationSso />)

    expect(document.getElementById('new-sso-issuer')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'SAML' }))

    expect(document.getElementById('new-sso-issuer')).toBeNull()
    expect(document.getElementById('new-sso-entryPoint')).not.toBeNull()
  })

  it('shows a SAML connection by its sign-on URL', () => {
    useSsoConnections.mockReturnValue({
      data: { connections: [makeSamlConnection()] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationSso />)

    expect(screen.getByText('https://acme.okta.com/app/acme/sso/saml')).toBeVisible()
    expect(screen.getByText('saml')).toBeVisible()
  })

  it('turns auto-provisioning on for a connection that requires invites', async () => {
    updateMutateAsync.mockResolvedValue({
      connection: makeConnection({ justInTimeProvisioning: true }),
    })
    useSsoConnections.mockReturnValue({
      data: { connections: [makeConnection()] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationSso />)

    fireEvent.click(screen.getByRole('button', { name: 'Auto-provision' }))

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        connectionId: 'sso-1',
        input: { justInTimeProvisioning: true },
      })
    })
  })

  it('turns auto-provisioning back off', async () => {
    updateMutateAsync.mockResolvedValue({ connection: makeConnection() })
    useSsoConnections.mockReturnValue({
      data: { connections: [makeConnection({ justInTimeProvisioning: true })] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationSso />)

    fireEvent.click(screen.getByRole('button', { name: 'Require invite' }))

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        connectionId: 'sso-1',
        input: { justInTimeProvisioning: false },
      })
    })
  })

  it('enables a disabled connection', async () => {
    updateMutateAsync.mockResolvedValue({ connection: makeConnection() })
    useSsoConnections.mockReturnValue({
      data: { connections: [makeConnection({ enabled: false })] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationSso />)

    fireEvent.click(screen.getByRole('button', { name: 'Enable' }))

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        connectionId: 'sso-1',
        input: { enabled: true },
      })
    })
  })

  it('removes a connection', async () => {
    deleteMutateAsync.mockResolvedValue(undefined)
    useSsoConnections.mockReturnValue({
      data: { connections: [makeConnection()] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationSso />)

    fireEvent.click(screen.getByRole('button', { name: /remove connection Acme Okta/i }))
    await waitFor(() => expect(deleteMutateAsync).toHaveBeenCalledWith('sso-1'))
  })

  it('reports a refused assertion without clearing the token', async () => {
    verifyMutateAsync.mockRejectedValue(new Error('rejected'))
    useSsoConnections.mockReturnValue({
      data: { connections: [makeConnection()] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationSso />)

    fireEvent.click(screen.getByRole('button', { name: 'Test' }))
    fireEvent.change(document.getElementById('sso-id-token-sso-1') as HTMLInputElement, {
      target: { value: 'a.b.c' },
    })
    fireEvent.change(document.getElementById('sso-nonce-sso-1') as HTMLInputElement, {
      target: { value: 'nonce-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    // Leaving the token in place lets an admin retry after fixing the config.
    expect((document.getElementById('sso-id-token-sso-1') as HTMLInputElement).value).toBe('a.b.c')
  })

  it('says an account would be created when the assertion is for a new user', async () => {
    verifyMutateAsync.mockResolvedValue({
      decision: {
        subject: 'idp-user-2',
        email: 'grace@acme.com',
        name: 'Grace',
        organizationId: 'org-1',
        shouldProvision: true,
      },
    })
    useSsoConnections.mockReturnValue({
      data: { connections: [makeConnection()] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationSso />)

    fireEvent.click(screen.getByRole('button', { name: 'Test' }))
    fireEvent.change(document.getElementById('sso-id-token-sso-1') as HTMLInputElement, {
      target: { value: 'a.b.c' },
    })
    fireEvent.change(document.getElementById('sso-nonce-sso-1') as HTMLInputElement, {
      target: { value: 'nonce-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('new account would be created')
      )
    })
  })

  it('shows a connection with no domains without crashing', () => {
    useSsoConnections.mockReturnValue({
      data: { connections: [makeConnection({ allowedEmailDomains: [] })] },
      isPending: false,
      isError: false,
    })
    render(<OrganizationSso />)

    expect(screen.getByText(/no domains/i)).toBeVisible()
  })

  it('surfaces a load failure rather than pretending there are no connections', () => {
    useSsoConnections.mockReturnValue({ data: undefined, isPending: false, isError: true })
    render(<OrganizationSso />)

    expect(screen.getByText('Unable to load SSO connections.')).toBeVisible()
  })
})
