import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '@/lib/hooks/use-auth'
import { AuthProvider } from '@/providers/auth-provider'

const authApiMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  listOrganizations: vi.fn(),
}))

vi.mock('@/lib/api/auth', () => ({
  authApi: {
    getSession: authApiMock.getSession,
    listOrganizations: authApiMock.listOrganizations,
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

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

function AuthStatus() {
  const auth = useAuth()

  return <div>{auth.status}</div>
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
})
