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
export type AccessRequestStatus = 'pending' | 'approved' | 'denied' | 'rejected' | 'cancelled'
export type ProjectMembershipGrantSource = 'manual' | 'org_owner' | 'access_request'
export type SecretMode = (typeof SECRET_MODES)[number]
export type SecretStatus = (typeof SECRET_STATUSES)[number]
export type SecretEncryptionMode = 'encrypted' | 'plaintext'
export type SecretScope = 'project' | 'personal'
export type ProjectSettingsAccessMode = 'proxy' | 'direct' | 'both'
export type SecretAccessMode = 'direct' | 'proxy'
export type UserSecretAccessLevel = 'read'
export type UserSecretAccessStatus = 'active' | 'revoked'
export type PersonalSecretPromotionRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

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
  username: string
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
  showAllVariablesToMembers: boolean
  requireAccessRequest: boolean
  autoJoinForOrgMembers: boolean
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
  grantSource?: ProjectMembershipGrantSource
  createdAt: string
  user?: {
    id: string
    name: string
    username?: string | null
    email: string
    image: string | null
  }
}

export interface UserProject {
  project: Project
  membership: ProjectMembership | null
  orgRole: string
  canAccess: boolean
  canRequestAccess?: boolean
  effectiveRole?: ProjectRole | null
  pendingAccessRequest: boolean
  latestRequestStatus: AccessRequestStatus | null
  latestAccessRequest: AccessRequest | null
}

export interface AccessRequest {
  id: string
  projectId: string
  organizationId: string
  requesterId: string
  requestedRole: Extract<ProjectRole, 'member'>
  message: string | null
  status: AccessRequestStatus
  reviewedBy: string | null
  reviewerNote: string | null
  createdAt: string
  updatedAt: string
  requester?: {
    id: string
    name: string | null
    username?: string | null
    email: string | null
    image: string | null
  } | null
  reviewer?: {
    id: string
    name: string | null
    username?: string | null
    email: string | null
    image: string | null
  } | null
}

export interface Secret {
  id: string
  projectId: string
  organizationId?: string | null
  environment: string
  environmentId?: string | null
  name: string
  mode: SecretMode
  encryptionMode?: SecretEncryptionMode
  isSensitive?: boolean
  scope?: SecretScope
  status: SecretStatus
  currentVersionId: string
  createdByUserId?: string | null
  promotedFromSecretId?: string | null
  version?: number
  plaintextValue?: string
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
  environmentId?: string | null
  userId: string | null
  issuedByUserId: string | null
  expiresAt: string
  revokedAt: string | null
  activeSessionId: string | null
  maxRequestsPerSecond?: number | null
  maxRequestsTotal?: number | null
  requestCount?: number
  deviceFingerprint?: string | null
  allowedIps?: string[] | null
  ttlSeconds?: number | null
  lastUsedAt?: string | null
  lastUsedIp?: string | null
  lastUsedDevice?: string | null
  rateLimitMax: number | null
  rateLimitRemaining: number | null
  rateLimitResetAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectEnvironment {
  id: string
  projectId: string
  name: string
  slug: string
  color: string | null
  isDefault: boolean
  createdAt: string
}

export interface ProjectSettings {
  projectId: string
  accessMode: ProjectSettingsAccessMode
  defaultTtlSeconds: number
  requireDeviceBinding: boolean
  maxRequestsPerTokenPerDay: number
  allowPersonalSecrets: boolean
  requireMemberApprovalForSecretAccess: boolean
  updatedAt: string
}

export interface UserSecretAccess {
  id: string
  projectId: string
  userId: string
  secretId: string
  environmentId: string | null
  accessLevel: UserSecretAccessLevel
  status: UserSecretAccessStatus
  grantedBy: string
  revokedBy: string | null
  expiresAt: string | null
  grantedAt: string
  revokedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PersonalSecretPromotionRequest {
  id: string
  projectId: string
  personalSecretId: string
  requestedByUserId: string
  status: PersonalSecretPromotionRequestStatus
  targetEnvironmentId: string | null
  targetEnvironment: string
  targetName: string
  promotedSecretId: string | null
  reviewedByUserId: string | null
  reviewerNote: string | null
  createdAt: string
  updatedAt: string
}

export interface SecretAccessEvent {
  id: string
  organizationId: string
  projectId: string
  environmentId: string | null
  secretId: string
  userId: string | null
  proxyTokenId: string | null
  accessMode: SecretAccessMode
  eventType: string
  deviceFingerprint: string | null
  ipAddress: string | null
  userAgent: string | null
  countryCode: string | null
  responseTimeMs: number | null
  upstreamStatus: number | null
  errorCode: string | null
  occurredAt: string
}

export interface ProjectAnalyticsSummary {
  totalAccesses: number
  uniqueUsers: number
  uniqueDevices: number
  accessByMode: Record<SecretAccessMode, number>
  errorRate: number
  avgResponseTimeMs: number | null
  recentEvents: SecretAccessEvent[]
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
