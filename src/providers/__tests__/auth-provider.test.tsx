import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '@/lib/hooks/use-auth'
import { AuthProvider } from '@/providers/auth-provider'

const authApiMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  listOrganizations: vi.fn(),
  setActiveOrganization: vi.fn(),
}))

vi.mock('@/lib/api/auth', () => ({
  authApi: {
    getSession: authApiMock.getSession,
    listOrganizations: authApiMock.listOrganizations,
    setActiveOrganization: authApiMock.setActiveOrganization,
  },
}))

function renderWithProviders(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )

  return { ...rendered, queryClient }
}

function AuthStatus() {
  const auth = useAuth()

  return <div>{auth.status}</div>
}

function OrganizationSwitchHarness() {
  const auth = useAuth()

  return (
    <div>
      <span>{auth.activeOrganization?.organization.name ?? 'none'}</span>
      <button
        onClick={() => {
          void auth.setActiveOrganization({ organizationId: 'org_2' }).catch(() => undefined)
        }}
        type="button"
      >
        Switch
      </button>
    </div>
  )
}

const sessionOne = {
  session: {
    id: 'session_1',
    activeOrganizationId: 'org_1',
    activeOrganizationSlug: 'one',
  },
  user: { id: 'user_1', email: 'king@example.test', name: 'King' },
}

const sessionTwo = {
  ...sessionOne,
  session: {
    ...sessionOne.session,
    activeOrganizationId: 'org_2',
    activeOrganizationSlug: 'two',
  },
}

const organizationsOneActive = {
  organizations: [
    {
      organization: { id: 'org_1', slug: 'one', name: 'Org One', active: true },
      membership: { role: 'owner' },
    },
    {
      organization: { id: 'org_2', slug: 'two', name: 'Org Two', active: false },
      membership: { role: 'developer' },
    },
  ],
}

const organizationsTwoActive = {
  organizations: organizationsOneActive.organizations.map((entry) => ({
    ...entry,
    organization: {
      ...entry.organization,
      active: entry.organization.id === 'org_2',
    },
  })),
}

describe('AuthProvider', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not load organizations when there is no active session', async () => {
    authApiMock.getSession.mockResolvedValue(null)

    renderWithProviders(<AuthStatus />)

    await waitFor(() => {
      expect(screen.getByText('unauthenticated')).toBeInTheDocument()
    })

    expect(authApiMock.listOrganizations).not.toHaveBeenCalled()
  })

  it('switches organization only after server confirmation and clears scoped cache', async () => {
    authApiMock.getSession.mockResolvedValueOnce(sessionOne).mockResolvedValueOnce(sessionTwo)
    authApiMock.listOrganizations
      .mockResolvedValueOnce(organizationsOneActive)
      .mockResolvedValueOnce(organizationsTwoActive)
    authApiMock.setActiveOrganization.mockResolvedValue({
      activeOrganizationId: 'org_2',
      activeOrganizationSlug: 'two',
    })

    const { queryClient } = renderWithProviders(<OrganizationSwitchHarness />)
    queryClient.setQueryData(['projects', 'org_1'], [{ id: 'secret-project' }])

    await screen.findByText('Org One')
    fireEvent.click(screen.getByRole('button', { name: 'Switch' }))

    await screen.findByText('Org Two')
    expect(queryClient.getQueryData(['projects', 'org_1'])).toBeUndefined()
  })

  it('keeps the confirmed organization when the switch request fails', async () => {
    authApiMock.getSession.mockResolvedValue(sessionOne)
    authApiMock.listOrganizations.mockResolvedValue(organizationsOneActive)
    authApiMock.setActiveOrganization.mockRejectedValue(new Error('backend unavailable'))

    renderWithProviders(<OrganizationSwitchHarness />)
    await screen.findByText('Org One')
    fireEvent.click(screen.getByRole('button', { name: 'Switch' }))

    await waitFor(() => {
      expect(authApiMock.setActiveOrganization).toHaveBeenCalledWith({ organizationId: 'org_2' })
    })
    expect(screen.getByText('Org One')).toBeInTheDocument()
    expect(screen.queryByText('Org Two')).not.toBeInTheDocument()
  })
})
