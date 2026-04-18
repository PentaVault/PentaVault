export interface AuthSession {
  session: {
    id: string | null
    expiresAt: string | null
  }
  user: {
    id: string | null
    email: string | null
    name: string | null
    image: string | null
    emailVerified: boolean
  }
}

export interface AuthSessionListItem {
  id: string
  current: boolean
  expiresAt: string | null
  ipAddress: string | null
  userAgent: string | null
}

export interface AuthSessionListResponse {
  sessions: AuthSessionListItem[]
}

export interface RevokeSessionRequest {
  sessionId: string
}

export interface AuthContextValue {
  session: AuthSession | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  refresh: () => Promise<void>
  clear: () => void
}
