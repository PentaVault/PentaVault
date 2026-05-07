import { createStore } from 'zustand/vanilla'

import type { AuthOrganizationMembership, AuthSession } from '@/lib/types/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type AuthStoreState = {
  session: AuthSession | null
  organizations: AuthOrganizationMembership[]
  status: AuthStatus
}

type AuthStoreActions = {
  clearAuthState: () => void
  setAuthState: (state: Partial<AuthStoreState>) => void
}

export type AuthStore = AuthStoreState & AuthStoreActions
export type AuthStoreApi = ReturnType<typeof createAuthStore>

export const initialAuthStoreState: AuthStoreState = {
  session: null,
  organizations: [],
  status: 'loading',
}

export function createAuthStore(initState: AuthStoreState = initialAuthStoreState) {
  return createStore<AuthStore>()((set) => ({
    ...initState,
    clearAuthState: () =>
      set({
        session: null,
        organizations: [],
        status: 'unauthenticated',
      }),
    setAuthState: (state) => set(state),
  }))
}
