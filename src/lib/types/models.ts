export type ProjectRole = 'owner' | 'admin' | 'member'
export type ProjectStatus = 'active' | 'archived'
export type SecretMode = 'compatibility' | 'gateway'
export type SecretStatus = 'active' | 'archived' | 'revoked'
export type SecretVersionState = 'active' | 'superseded' | 'compromised' | 'destroyed'
export type TokenHashAlgorithm = 'sha256'
export type TokenMode = 'compatibility' | 'gateway'
export type AuditOutcome = 'success' | 'failure'

export interface User {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  slug: string
  name: string
  status: ProjectStatus
  createdByUserId: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectMembership {
  id: string
  projectId: string
  userId: string
  role: ProjectRole
  createdAt: string
}

export interface UserProject {
  project: Project
  membership: ProjectMembership
}

export interface Secret {
  id: string
  projectId: string
  environment: string
  name: string
  mode: SecretMode
  status: SecretStatus
  currentVersionId: string
  createdAt: string
  updatedAt: string
}

export interface SecretVersion {
  id: string
  secretId: string
  versionNumber: number
  state: SecretVersionState
  createdAt: string
}

export interface ProxyToken {
  formatVersion: number
  tokenPrefix: 'pv_tok_'
  tokenHashAlgorithm: TokenHashAlgorithm
  tokenHash: string
  tokenStart: string
  mode: TokenMode
  secretId: string
  expiresAt: string
  revokedAt: string | null
  activeSessionId: string | null
  rateLimitMax: number | null
  rateLimitRemaining: number | null
  rateLimitResetAt: string | null
}

export interface AuditEvent {
  id: string
  eventType: string
  outcome: AuditOutcome
  actorUserId: string | null
  actorSessionId: string | null
  projectId: string | null
  secretId: string | null
  tokenId: string | null
  route: string | null
  sourceIp: string | null
  failureReason: string | null
  metadata: Record<string, unknown>
  occurredAt: string
}
