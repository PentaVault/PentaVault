import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import type { MachineIdentity, MachineIdentityAuthMethod } from '@/lib/types/api'

import { OrganizationMachineIdentities } from '../organization-machine-identities'

const useMachineIdentities = vi.fn()
const useMachineIdentityAuthMethods = vi.fn()
const useMachineIdentityProjectGrants = vi.fn()
const useProjectsQuery = vi.fn()
const createIdentity = vi.fn()
const updateIdentity = vi.fn()
const deleteIdentity = vi.fn()
const createAuthMethod = vi.fn()
const setAuthMethodEnabled = vi.fn()
const deleteAuthMethod = vi.fn()
const grantProject = vi.fn()
const revokeProject = vi.fn()
const toastError = vi.fn()
const toastSuccess = vi.fn()

vi.mock('@/lib/hooks/use-machine-identities', () => ({
  useMachineIdentities: () => useMachineIdentities(),
  useCreateMachineIdentity: () => ({ mutateAsync: createIdentity, isPending: false }),
  useUpdateMachineIdentity: () => ({ mutateAsync: updateIdentity, isPending: false }),
  useDeleteMachineIdentity: () => ({ mutateAsync: deleteIdentity, isPending: false }),
  useMachineIdentityAuthMethods: (identityId: string | null) =>
    useMachineIdentityAuthMethods(identityId),
  useCreateMachineIdentityAuthMethod: () => ({ mutateAsync: createAuthMethod, isPending: false }),
  useSetMachineIdentityAuthMethodEnabled: () => ({
    mutateAsync: setAuthMethodEnabled,
    isPending: false,
  }),
  useDeleteMachineIdentityAuthMethod: () => ({ mutateAsync: deleteAuthMethod, isPending: false }),
  useMachineIdentityProjectGrants: (identityId: string | null) =>
    useMachineIdentityProjectGrants(identityId),
  useGrantMachineIdentityProject: () => ({ mutateAsync: grantProject, isPending: false }),
  useRevokeMachineIdentityProject: () => ({ mutateAsync: revokeProject, isPending: false }),
}))

vi.mock('@/lib/hooks/use-projects', () => ({
  useProjectsQuery: () => useProjectsQuery(),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { error: toastError, success: toastSuccess } }),
}))

function makeIdentity(overrides: Partial<MachineIdentity> = {}): MachineIdentity {
  return {
    id: 'mid-1',
    organizationId: 'org-1',
    name: 'ci-deploy',
    description: 'Production deploy pipeline',
    enabled: true,
    createdByUserId: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeAuthMethod(
  overrides: Partial<MachineIdentityAuthMethod> = {}
): MachineIdentityAuthMethod {
  return {
    id: 'am-1',
    identityId: 'mid-1',
    type: 'aws-iam',
    enabled: true,
    config: {
      audience: 'pentavault',
      allowedAccountIds: ['123456789012'],
      allowedPrincipalArns: ['arn:aws:iam::123456789012:role/deploy-role'],
    },
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

function expand(): void {
  fireEvent.click(screen.getByRole('button', { expanded: false }))
}

beforeEach(() => {
  vi.clearAllMocks()
  useMachineIdentities.mockReturnValue({
    data: { identities: [makeIdentity()] },
    isPending: false,
    isError: false,
  })
  useMachineIdentityAuthMethods.mockReturnValue({ data: { authMethods: [] } })
  useMachineIdentityProjectGrants.mockReturnValue({ data: { grants: [] } })
  useProjectsQuery.mockReturnValue({
    data: { projects: [{ project: { id: 'proj-1', name: 'Payments API' } }] },
  })
  createIdentity.mockResolvedValue(makeIdentity())
  createAuthMethod.mockResolvedValue(makeAuthMethod())
  grantProject.mockResolvedValue({})
})

describe('OrganizationMachineIdentities', () => {
  it('lists identities with their enabled state', () => {
    render(<OrganizationMachineIdentities />)

    expect(screen.getByText('ci-deploy')).toBeInTheDocument()
    expect(screen.getByText('Production deploy pipeline')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('refuses to create an identity with no name', async () => {
    render(<OrganizationMachineIdentities />)

    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(createIdentity).not.toHaveBeenCalled()
  })

  it('creates an identity and clears the form', async () => {
    render(<OrganizationMachineIdentities />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'build-runner' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'CI' } })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() =>
      expect(createIdentity).toHaveBeenCalledWith({ name: 'build-runner', description: 'CI' })
    )
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('')
  })

  it('warns that disabling revokes tokens already issued', async () => {
    render(<OrganizationMachineIdentities />)

    fireEvent.click(screen.getByRole('button', { name: 'Disable' }))

    await waitFor(() =>
      expect(updateIdentity).toHaveBeenCalledWith({
        identityId: 'mid-1',
        input: { enabled: false },
      })
    )
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringMatching(/revoked/i))
  })

  it('loads auth methods only once a row is expanded', () => {
    render(<OrganizationMachineIdentities />)

    expect(useMachineIdentityAuthMethods).toHaveBeenLastCalledWith(null)

    expand()

    expect(useMachineIdentityAuthMethods).toHaveBeenLastCalledWith('mid-1')
  })

  it('summarises what an existing AWS method actually trusts', () => {
    useMachineIdentityAuthMethods.mockReturnValue({ data: { authMethods: [makeAuthMethod()] } })
    render(<OrganizationMachineIdentities />)
    expand()

    expect(
      screen.getByText('accounts 123456789012 · arn:aws:iam::123456789012:role/deploy-role')
    ).toBeInTheDocument()
  })

  it('summarises a Kubernetes method by namespace', () => {
    useMachineIdentityAuthMethods.mockReturnValue({
      data: {
        authMethods: [
          makeAuthMethod({
            type: 'kubernetes',
            config: {
              issuer: 'https://oidc.example/id/X',
              jwksUri: 'https://oidc.example/id/X/keys',
              audience: 'pentavault',
              allowedNamespaces: ['payments'],
              allowedServiceAccountNames: ['api'],
            },
          }),
        ],
      },
    })
    render(<OrganizationMachineIdentities />)
    expand()

    expect(screen.getByText('namespaces payments · api')).toBeInTheDocument()
  })

  it('shows the fields the selected method needs and submits them as lists', async () => {
    render(<OrganizationMachineIdentities />)
    expand()

    // AWS is the default selection; its account allowlist is mandatory.
    fireEvent.change(screen.getByLabelText(/^Audience/), { target: { value: 'pentavault' } })
    fireEvent.change(screen.getByLabelText(/^Allowed account ids/), {
      target: { value: '123456789012, 210987654321' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add method/i }))

    await waitFor(() =>
      expect(createAuthMethod).toHaveBeenCalledWith({
        identityId: 'mid-1',
        input: {
          type: 'aws-iam',
          config: {
            audience: 'pentavault',
            allowedAccountIds: ['123456789012', '210987654321'],
          },
        },
      })
    )
  })

  it('refuses to submit a method missing a required field', async () => {
    render(<OrganizationMachineIdentities />)
    expand()

    fireEvent.change(screen.getByLabelText(/^Audience/), { target: { value: 'pentavault' } })
    fireEvent.click(screen.getByRole('button', { name: /add method/i }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(createAuthMethod).not.toHaveBeenCalled()
  })

  it('says plainly that a login with no project grant can read nothing', () => {
    render(<OrganizationMachineIdentities />)
    expand()

    expect(screen.getByText(/can read nothing/i)).toBeInTheDocument()
  })

  it('lists an existing grant by project name rather than id', () => {
    useMachineIdentityProjectGrants.mockReturnValue({
      data: {
        grants: [
          {
            id: 'g-1',
            identityId: 'mid-1',
            projectId: 'proj-1',
            role: 'member' as const,
            createdAt: '2026-08-01T00:00:00.000Z',
          },
        ],
      },
    })
    render(<OrganizationMachineIdentities />)
    expand()

    expect(screen.getByText('Payments API')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Revoke access to Payments API' })
    ).toBeInTheDocument()
  })

  it('refuses to grant access without choosing a project', async () => {
    render(<OrganizationMachineIdentities />)
    expand()

    fireEvent.click(screen.getByRole('button', { name: 'Grant' }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(grantProject).not.toHaveBeenCalled()
  })

  it('reports a failure to load rather than showing an empty list', () => {
    useMachineIdentities.mockReturnValue({ data: undefined, isPending: false, isError: true })
    render(<OrganizationMachineIdentities />)

    expect(screen.getByText(/unable to load machine identities/i)).toBeInTheDocument()
  })

  it('offers every supported method type', () => {
    render(<OrganizationMachineIdentities />)
    expand()

    const selector = screen.getByLabelText('Authentication method type')
    expect(within(selector).getByText('AWS IAM')).toBeInTheDocument()
  })
})
