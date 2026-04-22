import type {
  AUDIT_OUTCOMES,
  PROJECT_ROLES,
  PROJECT_STATUSES,
  SECRET_MODES,
  SECRET_STATUSES,
} from '@/lib/constants'

export type ProjectRole = (typeof PROJECT_ROLES)[number]
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]
export type ProjectVisibility = 'open' | 'private'
export type AccessRequestStatus = 'pending' | 'approved' | 'denied' | 'cancelled'
export type SecretMode = (typeof SECRET_MODES)[number]
export type SecretStatus = (typeof SECRET_STATUSES)[number]

export type SecretVersionState = 'active' | 'superseded' | 'compromised' | 'destroyed'
export type TokenHashAlgorithm = 'sha256'
export type TokenMode = 'compatibility' | 'gateway'
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number]
export type SecurityAlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type SecurityAlertStatus =
  | 'open'
  | 'acknowledged'
  | 'investigating'
  | 'mitigated'
  | 'resolved'
  | 'closed_no_action'
export type SecurityAlertType =
  | 'probable_leak'
  | 'rotation_recommended'
  | 'new_device'
  | 'new_location'
  | 'suspicious_auth_activity'
export type RotationRecommendationAction =
  | 'token_revoke'
  | 'session_revoke'
  | 'provider_secret_rotate'

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
  organizationId: string
  slug: string
  name: string
  visibility: ProjectVisibility
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
  user?: {
    id: string
    name: string
    email: string
    image: string | null
  }
}

export interface UserProject {
  project: Project
  membership: ProjectMembership | null
  orgRole: string
  canAccess: boolean
  pendingAccessRequest: boolean
  latestRequestStatus: AccessRequestStatus | null
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
  userId: string | null
  issuedByUserId: string | null
  expiresAt: string
  revokedAt: string | null
  activeSessionId: string | null
  rateLimitMax: number | null
  rateLimitRemaining: number | null
  rateLimitResetAt: string | null
  createdAt: string
  updatedAt: string
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

export interface SecurityAlert {
  id: string
  projectId: string
  secretId: string | null
  tokenId: string | null
  alertType: SecurityAlertType
  severity: SecurityAlertSeverity
  status: SecurityAlertStatus
  ownerUserId: string | null
  ownerTeam: string | null
  source: string
  confidence: string | null
  title: string
  summary: string
  metadata: Record<string, unknown>
  assignedAt: string | null
  acknowledgedAt: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RotationRecommendation {
  id: string
  alertId: string
  projectId: string
  secretId: string | null
  recommendedAction: RotationRecommendationAction
  provider: string | null
  status: SecurityAlertStatus
  rationale: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
