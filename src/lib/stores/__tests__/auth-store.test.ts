import { createAuthStore } from '@/lib/stores/auth-store'
import type { AuthSession } from '@/lib/types/auth'

const session = {
  session: {
    id: 'session_123',
    expiresAt: '2026-05-01T00:00:00.000Z',
    activeOrganizationId: 'org_123',
    activeOrganizationSlug: 'acme',
  },
  user: {
    id: 'user_123',
    email: 'owner@example.com',
    name: 'Owner',
    username: 'owner',
    image: null,
    emailVerified: true,
    twoFactorEnabled: true,
    defaultOrganizationId: 'org_123',
  },
} satisfies AuthSession

describe('createAuthStore', () => {
  it('starts in loading state and updates auth state', () => {
    const store = createAuthStore()

    expect(store.getState().status).toBe('loading')

    store.getState().setAuthState({
      session,
      status: 'authenticated',
      organizations: [
        {
          organization: {
            id: 'org_123',
            name: 'Acme',
            slug: 'acme',
            active: true,
            isDefault: true,
            defaultProjectVisibility: 'private',
            privateProjectDiscoverability: 'visible',
            membersCanSeeAllProjects: true,
            membersCanRequestProjectAccess: true,
          },
          membership: {
            id: 'member_123',
            userId: 'user_123',
            role: 'owner',
            memberType: 'member',
            expiresAt: null,
          },
        },
      ],
    })

    expect(store.getState().session?.user.id).toBe('user_123')
    expect(store.getState().organizations).toHaveLength(1)
    expect(store.getState().status).toBe('authenticated')
  })

  it('clears auth state without persisting sensitive values', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const store = createAuthStore({ session, organizations: [], status: 'authenticated' })

    store.getState().clearAuthState()

    expect(store.getState()).toMatchObject({
      session: null,
      organizations: [],
      status: 'unauthenticated',
    })
    expect(setItem).not.toHaveBeenCalled()
    expect(JSON.stringify(store.getState())).not.toContain('pv_tok_')

    setItem.mockRestore()
  })
})
