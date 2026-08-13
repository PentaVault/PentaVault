import type {
  AuthSession,
  AuthSessionListResponse,
  OrgInvitation,
  OrgRole,
  RevokeSessionRequest,
} from '@/lib/types/auth'
import type {
  AccessGroup,
  AccessGroupMember,
  AccessGroupProjectRole,
  AccessRequest,
  AppConnection,
  AppConnectionProvider,
  AuditEvent,
  AuditLogStream,
  ConfigChangeRequest,
  DynamicSecret,
  DynamicSecretLease,
  GitHubSecretSyncDestination,
  OutboundWebhook,
  PersonalSecretPromotionRequest,
  Project,
  ProjectAccessGroupGrant,
  ProjectAnalyticsSummary,
  ProjectConfig,
  ProjectConfigShare,
  ProjectEnvironment,
  ProjectMemberEnvironmentAccess,
  ProjectMembership,
  ProjectRole,
  ProjectSettings,
  ProxyToken,
  PublicSecretShare,
  RotationRecommendation,
  Secret,
  SecretAccessEvent,
  SecretAccessRequest,
  SecretMode,
  SecretScanFinding,
  SecretShare,
  SecretShareAccessScope,
  SecretSnapshot,
  SecretSync,
  SecretSyncDelivery,
  SecretSyncProvider,
  SecretValidationRule,
  SecretValueConstraint,
  SecretVersion,
  SecurityAlert,
  SecurityAlertStatus,
  UserProject,
  UserSecretAccess,
  VercelSecretSyncDestination,
  WebhookDelivery,
  WebhookEventType,
} from '@/lib/types/models'

export interface ApiErrorResponse {
  code: string
  error: string
  message?: string
  requestId?: string
  suggestedSlug?: string
  retryAfter?: number
  fields?: Record<string, string>
}

export interface CreateProjectInput {
  id?: string
  name: string
}

export interface UpdateProjectInput {
  name?: Project['name']
  status?: Project['status']
  showAllVariablesToMembers?: Project['showAllVariablesToMembers']
  requireAccessRequest?: Project['requireAccessRequest']
  autoJoinForOrgMembers?: Project['autoJoinForOrgMembers']
}

export interface ListProjectsResponse {
  projects: UserProject[]
}

export type ProjectResponse = UserProject

export interface ProjectMembersResponse {
  members: ProjectMembership[]
}

export interface AccessGroupsResponse {
  groups: AccessGroup[]
}

export interface AccessGroupResponse {
  group: AccessGroup
}

export interface AccessGroupMembersResponse {
  members: AccessGroupMember[]
}

export interface ProjectAccessGroupsResponse extends AccessGroupsResponse {
  grants: ProjectAccessGroupGrant[]
}

export interface CreateAccessGroupInput {
  name: string
  slug: string
  description?: string | null
}

export type UpdateAccessGroupInput = Partial<CreateAccessGroupInput>

export interface ProjectAccessGroupGrantResponse {
  grant: ProjectAccessGroupGrant
}

export interface GrantProjectAccessGroupInput {
  role: AccessGroupProjectRole
}

export interface ProjectSecretsResponse {
  secrets: Secret[]
}

export interface ProjectTokensResponse {
  tokens: ProxyToken[]
}

export interface ProjectEnvironmentsResponse {
  environments: ProjectEnvironment[]
}

export interface ProjectConfigsResponse {
  configs: ProjectConfig[]
}

export interface ProjectConfigResponse {
  config: ProjectConfig
}

export interface CreateProjectConfigInput {
  environmentId: string
  name: string
  slug: string
  parentConfigId?: string | null
}

export interface DeleteProjectConfigResponse {
  deleted: boolean
  configId: string
}

export interface ProjectConfigShareResponse {
  share: ProjectConfigShare
}

export interface ConfigChangeRequestsResponse {
  requests: ConfigChangeRequest[]
}

export interface ConfigChangeRequestResponse {
  request: ConfigChangeRequest | null
}

export interface CreateConfigChangeRequestInput {
  sourceConfigId: string
  targetConfigId?: string | null
  title: string
  description?: string | null
  allKeys?: boolean
  secretNames?: string[]
}

export interface ProjectMemberEnvironmentAccessResponse {
  access: ProjectMemberEnvironmentAccess[]
  unavailable?: boolean
}

export interface ReplaceProjectMemberEnvironmentAccessInput {
  environmentIds: string[]
}

export interface CreateProjectEnvironmentInput {
  name: string
  slug: string
  color?: string | null
  isDefault?: boolean
  expiresAt?: string | null
}

export interface ProjectEnvironmentResponse {
  environment: ProjectEnvironment
}

export interface ProjectSettingsResponse {
  settings: ProjectSettings
}

export interface WebhooksResponse {
  webhooks: OutboundWebhook[]
  supportedEvents: readonly WebhookEventType[]
}

export interface WebhookResponse {
  webhook: OutboundWebhook
}

export interface CreateWebhookInput {
  name: string
  endpointUrl: string
  signingSecret?: string
  environmentId?: string | null
  folderPath: string
  eventTypes: WebhookEventType[]
  enabled?: boolean
  maxAttempts?: number
}

export interface UpdateWebhookInput {
  name?: string
  endpointUrl?: string
  signingSecret?: string | null
  environmentId?: string | null
  folderPath?: string
  eventTypes?: WebhookEventType[]
  enabled?: boolean
  maxAttempts?: number
}

export interface WebhookDeliveriesResponse {
  deliveries: WebhookDelivery[]
}

export interface WebhookDeliveryResponse {
  delivery: WebhookDelivery
}

export interface SecretValidationRulesResponse {
  rules: SecretValidationRule[]
}

export interface SecretValidationRuleResponse {
  rule: SecretValidationRule
}

export interface CreateSecretValidationRuleInput {
  name: string
  environmentId?: string | null
  folderPath?: string
  namePattern?: string | null
  constraints: SecretValueConstraint[]
  enabled?: boolean
}

export interface UpdateSecretValidationRuleInput {
  name?: string
  environmentId?: string | null
  folderPath?: string
  namePattern?: string | null
  constraints?: SecretValueConstraint[]
  enabled?: boolean
}

export interface SecretSnapshotsResponse {
  snapshots: SecretSnapshot[]
}

export interface SecretSnapshotResponse {
  snapshot: SecretSnapshot
}

export interface CreateSecretSnapshotInput {
  configId: string
  environmentId?: string | null
  folderPath?: string
  label?: string | null
}

export interface RestoreSecretSnapshotResponse {
  restored: number
  skipped: Array<{ secretId: string; name: string }>
}

export interface AuditLogStreamsResponse {
  streams: AuditLogStream[]
}

export interface AuditLogStreamResponse {
  stream: AuditLogStream
}

export interface CreateAuditLogStreamInput {
  name: string
  endpointUrl: string
  authToken?: string | null
  enabled?: boolean
}

export interface UpdateAuditLogStreamInput {
  name?: string
  endpointUrl?: string
  authToken?: string | null
  enabled?: boolean
}

export interface AppConnectionsResponse {
  connections: AppConnection[]
}

export interface AppConnectionResponse {
  connection: AppConnection
}

export interface CreateAppConnectionInput {
  name: string
  provider: AppConnectionProvider
  credential: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface UpdateAppConnectionInput {
  name?: string
  credential?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface DynamicSecretsResponse {
  dynamicSecrets: DynamicSecret[]
}

export interface DynamicSecretResponse {
  dynamicSecret: DynamicSecret
}

export interface DynamicSecretLeasesResponse {
  leases: DynamicSecretLease[]
}

export interface IssueDynamicSecretLeaseResponse {
  lease: DynamicSecretLease
  credential: string
}

export interface DynamicSecretLeaseResponse {
  lease: DynamicSecretLease
}

export interface CreateDynamicSecretInput {
  name: string
  environmentId?: string | null
  config?: Record<string, unknown>
  defaultTtlSeconds?: number
  maxTtlSeconds?: number
  enabled?: boolean
}

export interface UpdateDynamicSecretInput {
  name?: string
  environmentId?: string | null
  config?: Record<string, unknown>
  defaultTtlSeconds?: number
  maxTtlSeconds?: number
  enabled?: boolean
}

export interface IssueDynamicSecretLeaseInput {
  ttlSeconds?: number
}

export interface SecretScanResponse {
  findings: SecretScanFinding[]
  scanned: { bytes: number; findingCount: number }
}

export interface SecretScanInput {
  content: string
  source?: string
}

export interface SecretSyncsResponse {
  syncs: SecretSync[]
  supportedProviders: readonly SecretSyncProvider[]
}

export interface SecretSyncResponse {
  sync: SecretSync
}

interface CreateSecretSyncBaseInput {
  name: string
  credential: string
  environmentId?: string | null
  folderPath: string
  autoSyncEnabled?: boolean
  enabled?: boolean
  maxAttempts?: number
}

export type CreateSecretSyncInput = CreateSecretSyncBaseInput &
  (
    | { provider: 'github'; destinationConfig: GitHubSecretSyncDestination }
    | { provider: 'vercel'; destinationConfig: VercelSecretSyncDestination }
  )

export interface UpdateSecretSyncInput {
  name?: string
  credential?: string
  destinationConfig?: GitHubSecretSyncDestination | VercelSecretSyncDestination
  environmentId?: string | null
  folderPath?: string
  autoSyncEnabled?: boolean
  enabled?: boolean
  maxAttempts?: number
}

export interface SecretSyncDeliveriesResponse {
  deliveries: SecretSyncDelivery[]
}

export interface SecretSyncDeliveryResponse {
  delivery: SecretSyncDelivery
}

export interface SecretSharesResponse {
  shares: SecretShare[]
}

export interface CreateSecretShareInput {
  secretId: string
  name?: string | null
  expiresAt: string
  maxViews?: number
  password?: string | null
  accessScope?: SecretShareAccessScope
  authorizedEmails?: string[]
}

export interface CreateSecretShareResponse {
  share: SecretShare
  token: string
}

export interface SecretShareResponse {
  share: SecretShare
}

export interface PublicSecretShareResponse {
  share: PublicSecretShare
}

export interface AccessSecretShareResponse extends PublicSecretShareResponse {
  value: string
}

export interface ProjectSecretAccessResponse {
  access: UserSecretAccess[]
}

export interface SecretAccessResponse {
  access: UserSecretAccess
}

export interface RevokeSecretAccessResponse {
  revoked: boolean
  access: UserSecretAccess | null
  revokedTokenCount?: number
}

export interface RejectSecretAccessRequestResponse {
  rejected: boolean
}

export interface SecretAccessRequestsResponse {
  requests: SecretAccessRequest[]
}

export interface CreateSecretAccessRequestResponse {
  requested: true
  request: SecretAccessRequest | null
}

export interface CancelSecretAccessRequestResponse {
  cancelled: boolean
  request: SecretAccessRequest | null
}

export interface GrantSecretAccessInput {
  projectId: string
  secretId: string
  userId: string
  environmentId?: string | null
  expiresAt?: string | null
}

export interface PersonalSecretsResponse {
  secrets: Secret[]
}

export interface CreatePersonalSecretInput {
  projectId: string
  environment?: string
  environmentId?: string
  configId?: string
  name: string
  description?: string | null
  folderPath?: string
  tags?: string[]
  rotationIntervalDays?: number | null
  rotationReminderDays?: number | null
  plaintext: string
  mode: SecretMode
  encryptionMode?: Secret['encryptionMode']
  isSensitive?: boolean
}

export interface PromotionRequestsResponse {
  requests: PersonalSecretPromotionRequest[]
}

export interface PromotionRequestResponse {
  request: PersonalSecretPromotionRequest
}

export interface ApprovePromotionRequestResponse {
  request: PersonalSecretPromotionRequest | null
  secret: Secret
}

export interface PromotePersonalSecretInput {
  projectId: string
  secretId: string
  targetName?: string
  targetEnvironment?: string
  targetEnvironmentId?: string | null
}

export interface UpdateProjectSettingsInput {
  accessMode?: ProjectSettings['accessMode']
  defaultTtlSeconds?: number
  requireDeviceBinding?: boolean
  maxRequestsPerTokenPerDay?: number
  allowPersonalSecrets?: boolean
  requireMemberApprovalForSecretAccess?: boolean
  requiredChangeRequestApprovals?: number
}

export interface ProjectAnalyticsQuery {
  from?: string
  to?: string
  granularity?: 'hour' | 'day' | 'week'
  limit?: number
}

export interface ProjectAnalyticsResponse {
  summary: ProjectAnalyticsSummary
  events: SecretAccessEvent[]
  scope?: {
    projectId: string
    effectiveRole: ProjectRole
    granularity: 'hour' | 'day' | 'week'
    from: string | null
    to: string | null
  }
}

export interface ScopedProjectAnalyticsResponse {
  summary: ProjectAnalyticsSummary
  events: SecretAccessEvent[]
  secretId?: string
  userId?: string
  tokenId?: string
}

export interface CreateAccessRequestInput {
  requestedRole: 'member'
  message?: string
}

export interface AccessRequestResponse {
  request: AccessRequest
}

export interface ListAccessRequestsResponse {
  requests: AccessRequest[]
}

export interface ReviewAccessRequestInput {
  status: 'approved' | 'rejected'
  grantedRole?: 'member'
  reviewerNote?: string
}

export interface SendOrgInvitationInput {
  email: string
  role: OrgRole
}

export interface OrgInvitationResponse {
  invitation: OrgInvitation
  emailSent?: boolean
}

export interface VerifyInvitationResponse {
  valid: boolean
  expired: boolean
  alreadyUsed: boolean
  status: OrgInvitation['status'] | null
  organizationName: string | null
  invitedByName: string | null
  role: OrgRole | null
  email: string | null
  expiresAt: string | null
}

export interface UserSearchResult {
  id: string
  name: string | null
  username: string | null
  email: string | null
  image?: string | null
}

export interface UserSearchResponse {
  users: UserSearchResult[]
}

export interface NotificationRecord {
  id: string
  userId: string
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  readAt: string | null
  actionTaken: string | null
  createdAt: string
}

export interface NotificationListResponse {
  notifications: NotificationRecord[]
  unreadCount: number
  nextCursor: string | null
}

export interface ProjectMembershipResponse {
  membership: ProjectMembership
}

export interface CreateProjectMemberInput {
  userId: string
  role: Exclude<ProjectRole, 'owner'>
}

export interface UpdateProjectMemberInput {
  role: Exclude<ProjectRole, 'owner'>
}

export interface AuditListQuery {
  limit?: number
  cursor?: string
  eventType?: string
  outcome?: AuditEvent['outcome']
  actorUserId?: string
  occurredAfter?: string
  occurredBefore?: string
}

export interface AuditListResponse {
  events: AuditEvent[]
  nextCursor: string | null
}

export interface AuditExportQuery extends Omit<AuditListQuery, 'cursor' | 'limit'> {
  format: 'csv' | 'jsonl'
  maxRecords?: number
}

export interface CreateSecretInput {
  id?: string
  projectId: string
  environment?: string
  environmentId?: string
  configId?: string
  name: string
  plaintext: string
  mode: SecretMode
  encryptionMode?: Secret['encryptionMode']
  isSensitive?: boolean
  scope?: Secret['scope']
}

export interface CreateSecretResponse {
  secret: Secret
  currentVersionId: string
  versionNumber: number
}

export interface UpdateSecretInput {
  projectId: string
  secretId: string
  plaintext: string
}

export interface UpdateSecretResponse {
  secret: Secret
}

export interface UpdateSecretMetadataInput {
  projectId: string
  secretId: string
  description?: string | null
  folderPath?: string
  tags?: string[]
  rotationIntervalDays?: number | null
  rotationReminderDays?: number | null
}

export interface UpdateSecretMetadataResponse {
  secret: Secret
}

export interface SecretVersionsResponse {
  versions: SecretVersion[]
  retentionMonths: number
}

export interface RestoreSecretVersionResponse {
  secret: Secret
  currentVersion: SecretVersion
}

export interface ImportSecretsInput {
  projectId: string
  environment?: string
  environmentId?: string
  configId?: string
  mode: SecretMode
  encryptionMode?: Secret['encryptionMode']
  isSensitive?: boolean
  description?: string | null
  folderPath?: string
  tags?: string[]
  scope?: Secret['scope']
  issueTokens?: boolean
  secrets: Record<string, string>
}

export interface ImportSecretsResponse {
  imported: Array<{
    name: string
    secretId: string
    currentVersionId: string
    versionNumber: number
  }>
  updated?: Array<{
    name: string
    secretId: string
    currentVersionId: string
    versionNumber: number
  }>
  failed?: Array<{
    name: string
    reason: string
  }>
  tokens: Record<string, string>
}

export interface IssueTokenInput {
  secretId: string
  environmentId?: string
  userId?: string
  mode: SecretMode
  expiresAt?: string
  activeSessionId?: string
  maxRequestsPerSecond?: number
  maxRequestsTotal?: number
  deviceFingerprint?: string
  allowedIps?: string[]
  ttlSeconds?: number
  rateLimitMax?: number
  rateLimitRemaining?: number
  rateLimitResetAt?: string
}

export interface IssueTokenResponse {
  token: string
  tokenStart: string
  tokenHash: string
  userId: string | null
  secretId: string
  mode: SecretMode
  expiresAt: string
}

export interface BatchIssueTokensInput {
  projectId: string
  secretIds: string[]
  userId?: string
  expiresAt?: string | null
}

export interface BatchIssueTokensResponse {
  tokens: Array<{
    secretId: string
    rawToken: string
    tokenStart: string
    createdAt: string
  }>
}

export interface ResolveBulkInput {
  tokens: string[]
  activeSessionId?: string
}

export interface ResolveBulkResponse {
  resolved: Array<{
    token: string
    value: string
    secretName: string
  }>
  denied: Array<{
    token: string
    code: string
  }>
}

export type RevokeTokenInput =
  | {
      token: string
      tokenHash?: never
      projectId?: string
    }
  | {
      token?: never
      tokenHash: string
      projectId?: string
    }

export interface RevokeTokenResponse {
  revoked: boolean
  alreadyRevoked: boolean
  tokenStart: string | null
  revokedAt: string | null
}

export type AuthSessionResponse = AuthSession | null
export type AuthSessionListApiResponse = AuthSessionListResponse
export type AuthSessionRevokeRequest = RevokeSessionRequest

export interface AuthCreateApiKeyRequest {
  name?: string
  permissions?: AuthApiKeyPermissions
  organizationId: string
  tokenType?: AuthApiKeyTokenType
}

export type AuthApiKeyTokenType = 'command-line' | 'service-account' | 'personal' | 'scim' | 'audit'

export type AuthApiKeyPermissionResource = 'proxy'

export type AuthApiKeyPermissionAction = 'read' | 'write' | 'create' | 'delete'

export type AuthApiKeyPermissions = Partial<
  Record<AuthApiKeyPermissionResource, AuthApiKeyPermissionAction[]>
>

export interface AuthApiKeyListItem {
  id: string
  name: string | null
  start: string | null
  prefix: string | null
  enabled: boolean
  expiresAt: string | Date | null
  createdAt: string | Date
  updatedAt: string | Date
  lastRequest: string | Date | null
  requestCount: number
  rateLimitEnabled: boolean
  rateLimitMax: number | null
  rateLimitTimeWindow: number | null
  permissions: AuthApiKeyPermissions
  source: 'user' | 'cli' | 'application'
  tokenType: AuthApiKeyTokenType
  organizationId: string | null
  organizationName: string | null
  isCli?: boolean
}

export interface AuthApiKeyListResponse {
  apiKeys: AuthApiKeyListItem[]
}

export interface AuthApiKeyRevokeResponse {
  revoked: boolean
  apiKeyId: string
}

export interface AuthCreateApiKeyResponse {
  headerName: string
  key: string
  apiKey: {
    id: string | null
    name: string | null
    start: string | null
    prefix: string | null
    expiresAt: string | null
    metadata: unknown
    permissions: AuthApiKeyPermissions | null
    rateLimitEnabled: boolean | null
    rateLimitMax: number | null
    rateLimitTimeWindow: number | null
  }
}

export interface AuthCapabilitiesResponse {
  captcha: {
    enabled: boolean
    provider: 'cloudflare-turnstile'
    siteKey: string | null
  }
  passkey: {
    enabled: boolean
  }
  admin: {
    enabled: boolean
  }
  jwt: {
    enabled: boolean
  }
}

export interface AuthCaptchaInput {
  captchaToken?: string | undefined
}

export interface AuthSignInWithEmailInput {
  email: string
  password: string
  captchaToken?: string | undefined
}

export interface AuthSignUpWithEmailInput {
  name: string
  email: string
  password: string
}

export interface AuthStartRegistrationInput {
  name: string
  email: string
  username: string
  password: string
  captchaToken?: string | undefined
}

export interface AuthCompleteRegistrationInput {
  email: string
  otp: string
}

export interface AuthSignInWithEmailResponse {
  twoFactorRedirect?: boolean
  twoFactorMethods?: string[]
}

export interface AuthVerifyEmailOtpInput {
  email: string
  otp: string
}

export interface AuthRequestPasswordResetOtpInput {
  email: string
  captchaToken?: string | undefined
}

export interface AuthResetPasswordWithOtpInput {
  email: string
  otp: string
  password: string
  totpCode?: string
  captchaToken?: string | undefined
}

export interface AuthPasskey {
  id: string
  name?: string | null
  credentialID?: string
  deviceType?: string
  backedUp?: boolean
  createdAt?: string | Date | null
}

export interface AuthResetPasswordWithOtpResponse {
  success?: boolean
  requiresMfa?: boolean
}

export interface AuthEnableMfaInput {
  password: string
}

export interface AuthEnableMfaResponse {
  totpURI: string
  backupCodes: string[]
}

export interface AuthVerifyTotpInput {
  code: string
  trustDevice?: boolean
}

export interface AuthVerifyBackupCodeInput {
  code: string
  trustDevice?: boolean
}

export interface AuthDisableMfaInput {
  password: string
  code: string
}

export interface AuthStartMfaChangeInput {
  password: string
  verificationMethod: 'totp' | 'recovery'
  code: string
}

export interface AuthStartRecoveryMfaSetupInput {
  password: string
  code: string
}

export interface AuthCompleteMfaSetupInput {
  code: string
}

export interface AuthChangePasswordInput {
  currentPassword: string
  newPassword: string
  totpCode?: string
}

export interface AuthSessionRevokeResponse {
  revoked: boolean
  sessionId: string
}

export interface RemoveProjectMemberResponse {
  removed: boolean
  userId: string
}

export interface CreateProbableLeakAlertInput {
  secretId?: string
  tokenId?: string
  source: string
  title: string
  summary: string
  provider?: string
  confidence?: string
  metadata?: Record<string, unknown>
}

export interface CreateProbableLeakAlertResponse {
  alert: SecurityAlert
  recommendation: RotationRecommendation
}

export interface UpdateSecurityAlertInput {
  status: SecurityAlertStatus
  ownerUserId?: string | null
  note?: string
}

export interface UpdateSecurityAlertResponse {
  alert: SecurityAlert
}

export interface SecurityAlertsResponse {
  alerts: SecurityAlert[]
}

export interface RotationRecommendationsResponse {
  recommendations: RotationRecommendation[]
}

export interface UsageAvailability {
  isAvailable: false
}

export type TokenRecord = ProxyToken

export type FeatureFlagStatus = 'disabled' | 'enabled' | 'rollout'

export interface FeatureFlagTargeting {
  organizationIds?: string[]
  projectIds?: string[]
  userIds?: string[]
  deniedUserIds?: string[]
}

export interface FeatureFlag {
  id: string
  key: string
  description: string | null
  status: FeatureFlagStatus
  rolloutPercentage: number
  targeting: FeatureFlagTargeting
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface FeatureFlagResponse {
  flag: FeatureFlag
}

export interface FeatureFlagsResponse {
  flags: FeatureFlag[]
}

export interface CreateFeatureFlagInput {
  key: string
  description?: string | null
  status?: FeatureFlagStatus
  rolloutPercentage?: number
  targeting?: FeatureFlagTargeting
}

export interface UpdateFeatureFlagInput {
  description?: string | null
  status?: FeatureFlagStatus
  rolloutPercentage?: number
  targeting?: FeatureFlagTargeting
}

export type AnnouncementSeverity = 'info' | 'warning' | 'critical' | 'maintenance'
export type AnnouncementAudience = 'all' | 'authenticated' | 'anonymous'

export interface Announcement {
  id: string
  title: string
  body: string | null
  severity: AnnouncementSeverity
  audience: AnnouncementAudience
  organizationId: string | null
  active: boolean
  startsAt: string | null
  endsAt: string | null
  dismissible: boolean
  linkUrl: string | null
  linkLabel: string | null
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface AnnouncementResponse {
  announcement: Announcement
}

export interface AnnouncementsResponse {
  announcements: Announcement[]
}

export interface CreateAnnouncementInput {
  title: string
  body?: string | null
  severity?: AnnouncementSeverity
  audience?: AnnouncementAudience
  organizationId?: string | null
  active?: boolean
  startsAt?: string | null
  endsAt?: string | null
  dismissible?: boolean
  linkUrl?: string | null
  linkLabel?: string | null
}

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>

export interface PlatformContextResponse {
  flags: Record<string, boolean>
  announcements: Announcement[]
  isPlatformAdmin: boolean
}

export interface InstanceStats {
  organizations: number
  users: number
  projects: number
  activeProjects: number
  secrets: number
  machineIdentities: number
  activeProxyTokens: number
  collectedAt: string
}

export interface InstanceStatsResponse {
  stats: InstanceStats | null
}

export type ApprovalPolicyScope = 'secret_change' | 'access_request'

export interface ApprovalPolicy {
  id: string
  projectId: string
  name: string
  scope: ApprovalPolicyScope
  environmentId: string | null
  secretPath: string
  requiredApprovals: number
  approverUserIds: string[]
  approverGroupIds: string[]
  allowSelfApproval: boolean
  enabled: boolean
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface ApprovalPolicyResponse {
  policy: ApprovalPolicy
}

export interface ApprovalPoliciesResponse {
  policies: ApprovalPolicy[]
}

export interface CreateApprovalPolicyInput {
  name: string
  scope?: ApprovalPolicyScope
  environmentId?: string | null
  secretPath?: string
  requiredApprovals: number
  approverUserIds?: string[]
  approverGroupIds?: string[]
  allowSelfApproval?: boolean
  enabled?: boolean
}

export type UpdateApprovalPolicyInput = Partial<CreateApprovalPolicyInput>

/**
 * How a workload proves who it is. `oidc` is configured end to end by the
 * operator; the cloud methods take the provider's issuer and keys as given and
 * configure only which workload is trusted.
 */
export type MachineIdentityAuthMethodType = 'oidc' | 'aws-iam' | 'gcp-iam' | 'azure' | 'kubernetes'

export interface MachineIdentity {
  id: string
  organizationId: string
  name: string
  description: string | null
  /** Disabling revokes every token already issued, not just future logins. */
  enabled: boolean
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface OidcAuthMethodConfig {
  issuer: string
  jwksUri: string
  audience: string
  subjectClaim?: string
  requiredClaims: Record<string, string | string[]>
  allowedSubjects?: string[]
  accessTokenTtlSeconds?: number
}

export interface AwsIamAuthMethodConfig {
  audience: string
  allowedAccountIds: string[]
  allowedPrincipalArns?: string[]
  stsRegion?: string
  requestMaxAgeSeconds?: number
  accessTokenTtlSeconds?: number
}

export interface GcpIamAuthMethodConfig {
  audience: string
  allowedServiceAccountEmails: string[]
  allowedProjectIds?: string[]
  accessTokenTtlSeconds?: number
}

export interface AzureAuthMethodConfig {
  tenantId: string
  audience: string
  allowedObjectIds?: string[]
  allowedApplicationIds?: string[]
  accessTokenTtlSeconds?: number
}

export interface KubernetesAuthMethodConfig {
  issuer: string
  jwksUri: string
  audience: string
  allowedNamespaces: string[]
  allowedServiceAccountNames?: string[]
  accessTokenTtlSeconds?: number
}

export type MachineIdentityAuthMethodConfig =
  | OidcAuthMethodConfig
  | AwsIamAuthMethodConfig
  | GcpIamAuthMethodConfig
  | AzureAuthMethodConfig
  | KubernetesAuthMethodConfig

export interface MachineIdentityAuthMethod {
  id: string
  identityId: string
  type: MachineIdentityAuthMethodType
  enabled: boolean
  config: MachineIdentityAuthMethodConfig
  createdAt: string
  updatedAt: string
}

/** Machine identities never hold `owner`: that implies human accountability. */
export type MachineIdentityGrantRole = 'admin' | 'member'

export interface MachineIdentityProjectGrant {
  id: string
  identityId: string
  projectId: string
  role: MachineIdentityGrantRole
  createdAt: string
}

export interface MachineIdentitiesResponse {
  identities: MachineIdentity[]
}

export interface MachineIdentityAuthMethodsResponse {
  authMethods: MachineIdentityAuthMethod[]
}

export interface MachineIdentityProjectGrantsResponse {
  grants: MachineIdentityProjectGrant[]
}

export interface CreateMachineIdentityInput {
  name: string
  description?: string | null
  enabled?: boolean
}

export type UpdateMachineIdentityInput = Partial<CreateMachineIdentityInput>

export interface CreateMachineIdentityAuthMethodInput {
  type: MachineIdentityAuthMethodType
  config: MachineIdentityAuthMethodConfig
  enabled?: boolean
}

export interface ScimToken {
  id: string
  organizationId: string
  label: string
  lastUsedAt: string | null
  revokedAt: string | null
  createdByUserId: string | null
  createdAt: string
}

export interface ScimTokensResponse {
  tokens: ScimToken[]
}

/** The plaintext token is present only in the create response. */
export interface CreateScimTokenResponse {
  token: string
  scimToken: ScimToken
}

export type OrganizationKeyRewrapState = 'pending' | 'running' | 'complete' | 'failed'

export interface OrganizationEncryptionKey {
  id: string
  organizationId: string
  provider: 'aws-kms'
  keyRef: string
  region: string
  endpoint: string | null
  /** False stops new wraps but keeps the key available for unwrapping. */
  active: boolean
  rewrapState: OrganizationKeyRewrapState
  rewrapCompletedAt: string | null
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface OrganizationEncryptionKeysResponse {
  keys: OrganizationEncryptionKey[]
}

export interface OrganizationEncryptionKeyResponse {
  key: OrganizationEncryptionKey
}

export interface OrganizationKeyRewrapResponse {
  state: OrganizationKeyRewrapState
  progress: { scanned: number; rewrapped: number; skipped: number; failed: number }
}

export interface CreateOrganizationEncryptionKeyInput {
  keyRef: string
  region: string
  endpoint?: string
}

export type FolderCommitOperation = 'create' | 'update' | 'delete'

export interface FolderCommitChange {
  secretId: string
  secretName: string
  operation: FolderCommitOperation
  previousVersionId: string | null
  nextVersionId: string | null
}

export interface FolderCommit {
  id: string
  projectId: string
  configId: string | null
  environmentId: string | null
  folderPath: string
  /** Monotonic per folder, starting at 1. */
  sequence: number
  parentCommitId: string | null
  actorUserId: string | null
  message: string | null
  changes: FolderCommitChange[]
  createdAt: string
}

export interface FolderCommitsResponse {
  commits: FolderCommit[]
}

export interface FolderDiffEntry {
  secretId: string
  secretName: string
  operation: FolderCommitOperation
  fromVersionId: string | null
  toVersionId: string | null
}

export interface FolderDiff {
  fromSequence: number
  toSequence: number
  entries: FolderDiffEntry[]
}

export interface FolderDiffResponse {
  diff: FolderDiff
}

export interface FolderCommitListParams {
  folderPath?: string
  configId?: string
  environmentId?: string
  limit?: number
}

export type SsoProviderType = 'oidc' | 'saml'

interface SsoConnectionBase {
  id: string
  organizationId: string
  label: string
  allowedEmailDomains: string[]
  justInTimeProvisioning: boolean
  emailClaim: string
  nameClaim: string
  enabled: boolean
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface OidcSsoConnection extends SsoConnectionBase {
  provider: 'oidc'
  issuer: string
  jwksUri: string
  clientId: string
  authorizationEndpoint: string
  tokenEndpoint: string
}

export interface SamlSsoConnection extends SsoConnectionBase {
  provider: 'saml'
  entryPoint: string
  idpCert: string
  spEntityId: string
}

/** A connection is one protocol or the other, never a mix of both. */
export type SsoConnection = OidcSsoConnection | SamlSsoConnection

export interface SsoConnectionResponse {
  connection: SsoConnection
}

export interface SsoConnectionsResponse {
  connections: SsoConnection[]
}

interface CreateSsoConnectionShared {
  label: string
  allowedEmailDomains: string[]
  justInTimeProvisioning?: boolean
  emailClaim?: string
  nameClaim?: string
  enabled?: boolean
}

export interface CreateOidcSsoConnectionInput extends CreateSsoConnectionShared {
  provider?: 'oidc'
  issuer: string
  jwksUri: string
  clientId: string
  authorizationEndpoint: string
  tokenEndpoint: string
}

export interface CreateSamlSsoConnectionInput extends CreateSsoConnectionShared {
  provider: 'saml'
  entryPoint: string
  idpCert: string
  spEntityId: string
}

export type CreateSsoConnectionInput = CreateOidcSsoConnectionInput | CreateSamlSsoConnectionInput

export type UpdateSsoConnectionInput = Partial<Omit<CreateOidcSsoConnectionInput, 'provider'>> &
  Partial<Omit<CreateSamlSsoConnectionInput, 'provider'>>

/** Outcome of an admin testing a connection against a real ID token. */
export interface SsoVerificationDecision {
  subject: string
  email: string
  name: string | null
  organizationId: string
  shouldProvision: boolean
}

/** Identity only — discovery runs before anyone has authenticated. */
export interface SsoDiscoveredConnection {
  id: string
  label: string
}

export interface SsoDiscoveryResponse {
  connections: SsoDiscoveredConnection[]
}

export interface SsoVerificationResponse {
  decision: SsoVerificationDecision
}
