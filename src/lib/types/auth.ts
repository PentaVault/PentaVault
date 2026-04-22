export interface AuthSession {
  session: {
    id: string | null
    expiresAt: string | null
    activeOrganizationId?: string | null
    activeOrganizationSlug?: string | null
  }
  user: {
    id: string | null
    email: string | null
    name: string | null
    image: string | null
    emailVerified: boolean
    defaultOrganizationId?: string | null
  }
}

export interface AuthOrganization {
  id: string
  name: string
  slug: string
  active: boolean
  isDefault: boolean
  defaultProjectVisibility: string | null
  privateProjectDiscoverability: string | null
}

export interface AuthOrganizationMembership {
  organization: AuthOrganization
  membership: {
    id: string
    userId: string
    role: string
    memberType: string | null
    expiresAt: string | null
  }
}

export interface AuthOrganizationsResponse {
  organizations: AuthOrganizationMembership[]
}

export interface AuthSetActiveOrganizationInput {
  organizationId?: string | null
  organizationSlug?: string | null
}

export interface AuthSetActiveOrganizationResponse {
  activeOrganizationId: string | null
  activeOrganizationSlug: string | null
}

export interface AuthCreateOrganizationInput {
  name: string
  slug?: string
  logo?: string
  metadata?: Record<string, unknown>
  keepCurrentActiveOrganization?: boolean
}

export interface AuthUpdateOrganizationInput {
  organizationId: string
  data: {
    name?: string
    slug?: string
    logo?: string
    metadata?: Record<string, unknown> | null
  }
}

export interface AuthDeleteOrganizationInput {
  organizationId: string
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
  organizations: AuthOrganizationMembership[]
  activeOrganization: AuthOrganizationMembership | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  refresh: () => Promise<void>
  setActiveOrganization: (input: AuthSetActiveOrganizationInput) => Promise<void>
  clear: () => void
}
