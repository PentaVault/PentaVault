import type { AuthSession, AuthSessionListResponse, RevokeSessionRequest } from '@/lib/types/auth'
import type {
  AuditEvent,
  Project,
  ProjectMembership,
  ProjectRole,
  ProxyToken,
  RotationRecommendation,
  Secret,
  SecretMode,
  SecurityAlert,
  SecurityAlertStatus,
  UserProject,
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
}

export interface ListProjectsResponse {
  projects: UserProject[]
}

export type ProjectResponse = UserProject

export interface ProjectMembersResponse {
  members: ProjectMembership[]
}

export interface ProjectSecretsResponse {
  secrets: Secret[]
}

export interface ProjectTokensResponse {
  tokens: ProxyToken[]
}

export interface CreateAccessRequestInput {
  requestedRole: 'developer' | 'readonly'
  message?: string
}

export interface AccessRequestResponse {
  request: {
    id: string
    projectId: string
    organizationId: string
    requesterId: string
    requestedRole: 'developer' | 'readonly'
    message: string | null
    status: 'pending' | 'approved' | 'denied' | 'cancelled'
    reviewedBy: string | null
    reviewerNote: string | null
    createdAt: string
    updatedAt: string
  }
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

export interface CreateSecretInput {
  id?: string
  projectId: string
  environment?: string
  name: string
  plaintext: string
  mode: SecretMode
}

export interface CreateSecretResponse {
  secret: Secret
  currentVersionId: string
  versionNumber: number
}

export interface ImportSecretsInput {
  projectId: string
  environment?: string
  mode: SecretMode
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
  tokens: Record<string, string>
}

export interface IssueTokenInput {
  secretId: string
  userId?: string
  mode: SecretMode
  expiresAt?: string
  activeSessionId?: string
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
    }
  | {
      token?: never
      tokenHash: string
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
    rateLimitEnabled: boolean | null
    rateLimitMax: number | null
    rateLimitTimeWindow: number | null
  }
}

export interface AuthSignInWithEmailInput {
  email: string
  password: string
}

export interface AuthSignUpWithEmailInput {
  name: string
  email: string
  password: string
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
