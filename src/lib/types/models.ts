import type {
  AUDIT_OUTCOMES,
  PROJECT_ROLES,
  PROJECT_STATUSES,
  SECRET_MODES,
  SECRET_STATUSES,
} from '@/lib/constants'

export type ProjectRole = (typeof PROJECT_ROLES)[number] | 'owner'
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]
export type ProjectVisibility = 'open' | 'private'
export type AccessRequestStatus = 'pending' | 'approved' | 'denied' | 'rejected' | 'cancelled'
export type ProjectMembershipGrantSource = 'manual' | 'org_owner' | 'access_request'
export type SecretMode = (typeof SECRET_MODES)[number]
export type SecretStatus = (typeof SECRET_STATUSES)[number]
export type SecretEncryptionMode = 'encrypted' | 'plaintext'
export type SecretScope = 'project' | 'personal'
export type ProjectSettingsAccessMode = 'proxy' | 'direct' | 'both'
export type ProjectConfigType = 'root' | 'branch'
export type ProjectConfigVisibility = 'protected' | 'private' | 'shared'
export type SecretAccessMode = 'direct' | 'proxy'
export type UserSecretAccessLevel = 'read'
export type UserSecretAccessStatus = 'active' | 'expired' | 'revoked'
export type PersonalSecretPromotionRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type SecretAccessRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type SecretShareAccessScope = 'anyone' | 'organization' | 'recipients'
export type SecretShareStatus = 'active' | 'consumed' | 'expired' | 'revoked'
export type AccessGroupProjectRole = 'admin' | 'member' | 'readonly'

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
  groupRole?: AccessGroupProjectRole | null
  pendingAccessRequest: boolean
  latestRequestStatus: AccessRequestStatus | null
  latestAccessRequest: AccessRequest | null
}

export interface AccessGroup {
  id: string
  organizationId: string
  name: string
  slug: string
  description: string | null
  createdByUserId: string | null
  memberCount: number
  projectCount: number
  createdAt: string
  updatedAt: string
}

export interface AccessGroupMember {
  id: string
  groupId: string
  userId: string
  addedByUserId: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    image: string | null
  }
}

export interface ProjectAccessGroupGrant {
  id: string
  projectId: string
  groupId: string
  role: AccessGroupProjectRole
  grantedByUserId: string | null
  createdAt: string
  updatedAt: string
  group?: Pick<AccessGroup, 'id' | 'name' | 'slug' | 'organizationId'>
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
  configId?: string | null
  name: string
  description?: string | null
  folderPath?: string
  tags?: string[]
  mode: SecretMode
  encryptionMode?: SecretEncryptionMode
  isSensitive?: boolean
  scope?: SecretScope
  status: SecretStatus
  currentVersionId: string
  createdByUserId?: string | null
  promotedFromSecretId?: string | null
  version?: number
  lastRotatedAt?: string | null
  rotationIntervalDays?: number | null
  rotationReminderDays?: number | null
  nextRotationAt?: string | null
  plaintextValue?: string
  createdAt: string
  updatedAt: string
}

export interface SecretVersion {
  id: string
  secretId: string
  versionNumber: number
  state: SecretVersionState
  createdByUserId?: string | null
  createdFrom?: string
  restoredFromVersionId?: string | null
  supersededAt?: string | null
  supersededByVersionId?: string | null
  compromisedAt?: string | null
  compromiseReason?: string | null
  envelopeVersion?: number
  envelopeAlgorithm?: string
  wrappedKeyProvider?: string
  wrappedKeyRef?: string
  wrappedKeyAlgorithm?: string
  createdAt: string
}

export interface SecretShare {
  id: string
  projectId: string
  organizationId: string
  secretId: string
  secretVersionId: string
  secretName: string
  name: string | null
  tokenStart: string
  accessScope: SecretShareAccessScope
  authorizedEmails: string[]
  expiresAt: string
  maxViews: number
  viewCount: number
  remainingViews: number
  lastViewedAt: string | null
  revokedAt: string | null
  revokedByUserId: string | null
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
  passwordProtected: boolean
  status: SecretShareStatus
}

export type PublicSecretShare = Pick<
  SecretShare,
  | 'id'
  | 'name'
  | 'secretName'
  | 'accessScope'
  | 'expiresAt'
  | 'maxViews'
  | 'remainingViews'
  | 'passwordProtected'
>

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
  expiresAt: string | null
  createdAt: string
}

export interface ProjectConfig {
  id: string
  projectId: string
  environmentId: string
  parentConfigId: string | null
  type: ProjectConfigType
  name: string
  slug: string
  isProtected: boolean
  isPersonalDefault?: boolean
  visibility?: ProjectConfigVisibility
  canEdit?: boolean
  canShare?: boolean
  sharedWith?: ProjectConfigShare[]
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectConfigShare {
  configId: string
  userId: string
  sharedByUserId: string | null
  permission: 'read'
  createdAt: string
}

export interface ConfigChangeRequestItem {
  id: string
  changeRequestId: string
  operation: 'create' | 'update' | 'delete'
  secretName: string
  currentSecretId: string | null
  proposedSecretId: string | null
  createdAt: string
}

export interface ConfigChangeRequestApproval {
  id: string
  changeRequestId: string
  reviewerUserId: string
  status: 'approved' | 'rescinded'
  createdAt: string
  updatedAt: string
}

export interface ConfigChangeRequest {
  id: string
  organizationId: string
  projectId: string
  sourceConfigId: string | null
  targetConfigId: string
  title: string
  description: string | null
  status: 'draft' | 'in_review' | 'approved' | 'merged' | 'cancelled' | 'closed'
  requestedByUserId: string
  mergedByUserId: string | null
  mergedAt: string | null
  createdAt: string
  updatedAt: string
  items: ConfigChangeRequestItem[]
  approvals: ConfigChangeRequestApproval[]
}

export interface ProjectMemberEnvironmentAccess {
  id: string
  projectId: string
  userId: string
  environmentId: string
  grantedBy: string
  grantedAt: string
}

export interface ProjectSettings {
  projectId: string
  accessMode: ProjectSettingsAccessMode
  defaultTtlSeconds: number
  requireDeviceBinding: boolean
  maxRequestsPerTokenPerDay: number
  allowPersonalSecrets: boolean
  requireMemberApprovalForSecretAccess: boolean
  requiredChangeRequestApprovals: number
  updatedAt: string
}

export type WebhookEventType =
  | 'secrets.created'
  | 'secrets.updated'
  | 'secrets.deleted'
  | 'secrets.metadata_updated'
  | 'secrets.version_restored'

export type WebhookDeliveryStatus =
  | 'pending'
  | 'processing'
  | 'retry_scheduled'
  | 'succeeded'
  | 'dead_letter'

export interface OutboundWebhook {
  id: string
  projectId: string
  environmentId: string | null
  name: string
  endpointHost: string
  folderPath: string
  eventTypes: WebhookEventType[]
  enabled: boolean
  maxAttempts: number
  lastStatus: WebhookDeliveryStatus | null
  lastDeliveryAt: string | null
  lastError: string | null
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
  hasSigningSecret: boolean
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  projectId: string
  eventId: string
  eventType: string
  payload: Record<string, unknown>
  status: WebhookDeliveryStatus
  attemptCount: number
  nextAttemptAt: string | null
  lastAttemptAt: string | null
  deliveredAt: string | null
  responseStatus: number | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export type SecretValueConstraint =
  | { type: 'regex'; pattern: string; description?: string }
  | { type: 'min_length'; value: number }
  | { type: 'max_length'; value: number }
  | { type: 'disallow_whitespace' }
  | { type: 'allowed_values'; values: string[] }
  | { type: 'prevent_value_reuse'; versions: number }

export type SecretValueConstraintType = SecretValueConstraint['type']

export interface SecretValidationRule {
  id: string
  projectId: string
  name: string
  environmentId: string | null
  folderPath: string
  namePattern: string | null
  constraints: SecretValueConstraint[]
  enabled: boolean
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface SecretSnapshotEntry {
  secretId: string
  versionId: string
  name: string
}

export interface SecretSnapshot {
  id: string
  projectId: string
  configId: string | null
  environmentId: string | null
  folderPath: string
  label: string | null
  entries: SecretSnapshotEntry[]
  secretCount: number
  createdByUserId: string | null
  createdAt: string
}

export type AppConnectionProvider =
  | 'github'
  | 'vercel'
  | 'aws'
  | 'gcp'
  | 'openai'
  | 'anthropic'
  | 'generic'

export interface AppConnection {
  id: string
  organizationId: string
  name: string
  provider: AppConnectionProvider
  hasCredential: boolean
  metadata: Record<string, unknown>
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface AuditLogStream {
  id: string
  projectId: string
  name: string
  endpointUrl: string
  endpointHost: string
  hasToken: boolean
  enabled: boolean
  lastStatus: number | null
  lastDeliveryAt: string | null
  lastError: string | null
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export type SecretScanSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SecretScanFinding {
  ruleId: string
  description: string
  severity: SecretScanSeverity
  line: number
  column: number
  redactedMatch: string
}

export type DynamicSecretLeaseStatus = 'active' | 'revoked' | 'expired'

export interface DynamicSecret {
  id: string
  projectId: string
  environmentId: string | null
  name: string
  provider: 'generated'
  config: Record<string, unknown>
  defaultTtlSeconds: number
  maxTtlSeconds: number
  enabled: boolean
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface DynamicSecretLease {
  id: string
  dynamicSecretId: string
  projectId: string
  status: DynamicSecretLeaseStatus
  expiresAt: string
  revokedAt: string | null
  createdByUserId: string | null
  createdAt: string
}

export type SecretSyncProvider = 'github' | 'vercel'
export type SecretSyncDeliveryStatus = WebhookDeliveryStatus

export interface GitHubSecretSyncDestination {
  scope: 'repository' | 'environment'
  owner: string
  repository: string
  environment?: string
}

export interface VercelSecretSyncDestination {
  project: string
  teamId?: string
  targets: Array<'production' | 'preview' | 'development'>
  gitBranch?: string
}

export interface SecretSync {
  id: string
  projectId: string
  environmentId: string | null
  name: string
  provider: SecretSyncProvider
  destinationConfig: GitHubSecretSyncDestination | VercelSecretSyncDestination
  credentialHint: string
  credentialConfigured: true
  folderPath: string
  autoSyncEnabled: boolean
  enabled: boolean
  maxAttempts: number
  lastStatus: SecretSyncDeliveryStatus | null
  lastSyncedAt: string | null
  lastError: string | null
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface SecretSyncDelivery {
  id: string
  syncId: string
  projectId: string
  reason: 'manual' | 'automatic'
  status: SecretSyncDeliveryStatus
  attemptCount: number
  nextAttemptAt: string | null
  lastAttemptAt: string | null
  completedAt: string | null
  secretCount: number | null
  changedCount: number | null
  lastError: string | null
  createdAt: string
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

export interface SecretAccessRequest {
  id: string
  projectId: string
  secretId: string
  requesterId: string
  status: SecretAccessRequestStatus
  reviewedByUserId: string | null
  reviewerNote: string | null
  reviewedAt: string | null
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
