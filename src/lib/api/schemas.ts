import { z } from 'zod'

import {
  AUDIT_OUTCOMES,
  PROJECT_ROLES,
  PROJECT_STATUSES,
  SECRET_MODES,
  SECRET_STATUSES,
} from '@/lib/constants'

export function parseApiResponse<T>(schema: z.ZodType<unknown>, data: unknown): T {
  return schema.parse(data) as T
}

export function parseApiInput<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data)
}

const nullableStringSchema = z.string().nullable()
const optionalNullableStringSchema = z.string().nullable().optional()
const metadataSchema = z.record(z.string(), z.unknown())

const canonicalOrgRoleSchema = z.enum(['owner', 'admin', 'developer', 'auditor'])
export const orgRoleSchema = z.preprocess(
  (role) => (role === 'readonly' ? 'auditor' : role),
  canonicalOrgRoleSchema
)

export const authSessionSchema = z
  .object({
    session: z.object({
      id: nullableStringSchema,
      expiresAt: nullableStringSchema,
      activeOrganizationId: optionalNullableStringSchema,
      activeOrganizationSlug: optionalNullableStringSchema,
    }),
    user: z.object({
      id: nullableStringSchema,
      email: nullableStringSchema,
      name: nullableStringSchema,
      username: optionalNullableStringSchema,
      image: nullableStringSchema,
      emailVerified: z.boolean(),
      twoFactorEnabled: z.boolean(),
      defaultOrganizationId: optionalNullableStringSchema,
    }),
  })
  .nullable()

export const authOrganizationMembershipSchema = z.object({
  organization: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    active: z.boolean(),
    isDefault: z.boolean(),
    defaultProjectVisibility: nullableStringSchema,
    privateProjectDiscoverability: nullableStringSchema,
    membersCanSeeAllProjects: z.boolean().optional(),
    membersCanRequestProjectAccess: z.boolean().optional(),
  }),
  membership: z.object({
    id: z.string(),
    userId: z.string(),
    role: z.string(),
    memberType: nullableStringSchema,
    expiresAt: nullableStringSchema,
  }),
})

export const authOrganizationsResponseSchema = z.object({
  organizations: z.array(authOrganizationMembershipSchema),
})

export const authOrganizationMemberSchema = z.object({
  membership: z.object({
    id: z.string(),
    userId: z.string(),
    role: z.string(),
    memberType: nullableStringSchema,
    expiresAt: nullableStringSchema,
  }),
  user: z.object({
    id: z.string(),
    name: nullableStringSchema,
    username: optionalNullableStringSchema,
    email: nullableStringSchema,
    image: nullableStringSchema,
  }),
})

export const orgInvitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string(),
  role: orgRoleSchema,
  status: z.enum([
    'pending',
    'accepted',
    'rejected',
    'expired',
    'revoked',
    'cancelled',
    'canceled',
  ]),
  expiresAt: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  inviterId: z.string(),
  memberType: nullableStringSchema,
  acceptedByUserId: nullableStringSchema,
})

export const authOrganizationMembersResponseSchema = z.object({
  members: z.array(authOrganizationMemberSchema),
  invitations: z.array(orgInvitationSchema).optional(),
})

const projectRoleSchema = z.preprocess(
  (role) => (role === 'developer' || role === 'readonly' ? 'member' : role),
  z.enum(PROJECT_ROLES)
)
const projectStatusSchema = z.enum(PROJECT_STATUSES)
const secretModeSchema = z.enum(SECRET_MODES)
const secretEncryptionModeSchema = z.enum(['encrypted', 'plaintext'])
const secretScopeSchema = z.enum(['project', 'personal'])
const secretStatusSchema = z.enum(SECRET_STATUSES)
const auditOutcomeSchema = z.enum(AUDIT_OUTCOMES)
const projectSettingsAccessModeSchema = z.enum(['proxy', 'direct', 'both'])
const secretAccessModeSchema = z.enum(['direct', 'proxy'])
const userSecretAccessLevelSchema = z.enum(['read'])
const userSecretAccessStatusSchema = z.enum(['active', 'revoked'])
const personalSecretPromotionRequestStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'cancelled',
])

export const projectSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  slug: z.string(),
  name: z.string(),
  visibility: z.enum(['open', 'private']),
  showAllVariablesToMembers: z.boolean(),
  requireAccessRequest: z.boolean(),
  autoJoinForOrgMembers: z.boolean(),
  status: projectStatusSchema,
  createdByUserId: nullableStringSchema,
  archivedAt: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const projectMembershipSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  role: projectRoleSchema,
  grantSource: z.enum(['manual', 'org_owner', 'access_request']).optional(),
  createdAt: z.string(),
  user: z
    .object({
      id: z.string(),
      name: z.string(),
      username: optionalNullableStringSchema,
      email: z.string(),
      image: nullableStringSchema,
    })
    .optional(),
})

export const accessRequestSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  organizationId: z.string(),
  requesterId: z.string(),
  requestedRole: z.literal('member'),
  message: nullableStringSchema,
  status: z.enum(['pending', 'approved', 'denied', 'rejected', 'cancelled']),
  reviewedBy: nullableStringSchema,
  reviewerNote: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  requester: z
    .object({
      id: z.string(),
      name: nullableStringSchema,
      username: optionalNullableStringSchema,
      email: nullableStringSchema,
      image: nullableStringSchema,
    })
    .nullable()
    .optional(),
  reviewer: z
    .object({
      id: z.string(),
      name: nullableStringSchema,
      username: optionalNullableStringSchema,
      email: nullableStringSchema,
      image: nullableStringSchema,
    })
    .nullable()
    .optional(),
})

export const userProjectSchema = z.object({
  project: projectSchema,
  membership: projectMembershipSchema.nullable(),
  orgRole: orgRoleSchema,
  canAccess: z.boolean(),
  canRequestAccess: z.boolean().optional(),
  effectiveRole: projectRoleSchema.nullable().optional(),
  pendingAccessRequest: z.boolean(),
  latestRequestStatus: z
    .enum(['pending', 'approved', 'denied', 'rejected', 'cancelled'])
    .nullable(),
  latestAccessRequest: accessRequestSchema.nullable(),
})

export const listProjectsResponseSchema = z.object({
  projects: z.array(userProjectSchema),
})

export const projectMembersResponseSchema = z.object({
  members: z.array(projectMembershipSchema),
})

export const projectEnvironmentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  slug: z.string(),
  color: nullableStringSchema,
  isDefault: z.boolean(),
  createdAt: z.string(),
})

export const projectEnvironmentsResponseSchema = z.object({
  environments: z.array(projectEnvironmentSchema),
})

export const projectEnvironmentResponseSchema = z.object({
  environment: projectEnvironmentSchema,
})

export const projectSettingsSchema = z.object({
  projectId: z.string(),
  accessMode: projectSettingsAccessModeSchema,
  defaultTtlSeconds: z.number(),
  requireDeviceBinding: z.boolean(),
  maxRequestsPerTokenPerDay: z.number(),
  allowPersonalSecrets: z.boolean(),
  requireMemberApprovalForSecretAccess: z.boolean(),
  updatedAt: z.string(),
})

export const projectSettingsResponseSchema = z.object({
  settings: projectSettingsSchema,
})

export const projectMembershipResponseSchema = z.object({
  membership: projectMembershipSchema,
})

export const removeProjectMemberResponseSchema = z.object({
  removed: z.boolean(),
  userId: z.string(),
})

export const secretSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  organizationId: optionalNullableStringSchema,
  environment: z.string(),
  environmentId: optionalNullableStringSchema,
  name: z.string(),
  mode: secretModeSchema,
  encryptionMode: secretEncryptionModeSchema.optional(),
  isSensitive: z.boolean().optional(),
  scope: secretScopeSchema.optional(),
  status: secretStatusSchema,
  currentVersionId: z.string(),
  createdByUserId: optionalNullableStringSchema,
  promotedFromSecretId: optionalNullableStringSchema,
  version: z.number().optional(),
  plaintextValue: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const projectSecretsResponseSchema = z.object({
  secrets: z.array(secretSchema),
})

export const userSecretAccessSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  secretId: z.string(),
  environmentId: nullableStringSchema,
  accessLevel: userSecretAccessLevelSchema,
  status: userSecretAccessStatusSchema,
  grantedBy: z.string(),
  revokedBy: nullableStringSchema,
  expiresAt: nullableStringSchema,
  grantedAt: z.string(),
  revokedAt: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const projectSecretAccessResponseSchema = z.object({
  access: z.array(userSecretAccessSchema),
})

export const secretAccessResponseSchema = z.object({
  access: userSecretAccessSchema,
})

export const revokeSecretAccessResponseSchema = z.object({
  revoked: z.boolean(),
  access: userSecretAccessSchema.nullable(),
})

export const personalSecretPromotionRequestSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  personalSecretId: z.string(),
  requestedByUserId: z.string(),
  status: personalSecretPromotionRequestStatusSchema,
  targetEnvironmentId: nullableStringSchema,
  targetEnvironment: z.string(),
  targetName: z.string(),
  promotedSecretId: nullableStringSchema,
  reviewedByUserId: nullableStringSchema,
  reviewerNote: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const promotionRequestsResponseSchema = z.object({
  requests: z.array(personalSecretPromotionRequestSchema),
})

export const promotionRequestResponseSchema = z.object({
  request: personalSecretPromotionRequestSchema,
})

export const approvePromotionRequestResponseSchema = z.object({
  request: personalSecretPromotionRequestSchema.nullable(),
  secret: secretSchema,
})

export const createSecretResponseSchema = z.object({
  secret: secretSchema,
  currentVersionId: z.string(),
  versionNumber: z.number(),
})

export const updateSecretResponseSchema = z.object({
  secret: secretSchema,
})

export const importSecretsResponseSchema = z.object({
  imported: z.array(
    z.object({
      name: z.string(),
      secretId: z.string(),
      currentVersionId: z.string(),
      versionNumber: z.number(),
    })
  ),
  updated: z
    .array(
      z.object({
        name: z.string(),
        secretId: z.string(),
        currentVersionId: z.string(),
        versionNumber: z.number(),
      })
    )
    .optional(),
  failed: z
    .array(
      z.object({
        name: z.string(),
        reason: z.string(),
      })
    )
    .optional(),
  tokens: z.record(z.string(), z.string()),
})

export const deleteSecretResponseSchema = z.object({
  deleted: z.boolean(),
  alreadyDeleted: z.boolean().optional(),
  revokedTokenCount: z.number().optional(),
})

export const proxyTokenSchema = z.object({
  formatVersion: z.number(),
  tokenPrefix: z.literal('pv_tok_'),
  tokenHashAlgorithm: z.literal('sha256'),
  tokenHash: z.string(),
  tokenStart: z.string(),
  mode: z.enum(['compatibility', 'gateway']),
  secretId: z.string(),
  environmentId: optionalNullableStringSchema,
  userId: nullableStringSchema,
  issuedByUserId: nullableStringSchema,
  expiresAt: z.string(),
  revokedAt: nullableStringSchema,
  activeSessionId: nullableStringSchema,
  maxRequestsPerSecond: z.number().nullable().optional(),
  maxRequestsTotal: z.number().nullable().optional(),
  requestCount: z.number().optional(),
  deviceFingerprint: optionalNullableStringSchema,
  allowedIps: z.array(z.string()).nullable().optional(),
  ttlSeconds: z.number().nullable().optional(),
  lastUsedAt: optionalNullableStringSchema,
  lastUsedIp: optionalNullableStringSchema,
  lastUsedDevice: optionalNullableStringSchema,
  rateLimitMax: z.number().nullable(),
  rateLimitRemaining: z.number().nullable(),
  rateLimitResetAt: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const secretAccessEventSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  projectId: z.string(),
  environmentId: nullableStringSchema,
  secretId: z.string(),
  userId: nullableStringSchema,
  proxyTokenId: nullableStringSchema,
  accessMode: secretAccessModeSchema,
  eventType: z.string(),
  deviceFingerprint: nullableStringSchema,
  ipAddress: nullableStringSchema,
  userAgent: nullableStringSchema,
  countryCode: nullableStringSchema,
  responseTimeMs: z.number().nullable(),
  upstreamStatus: z.number().nullable(),
  errorCode: nullableStringSchema,
  occurredAt: z.string(),
})

export const projectAnalyticsSummarySchema = z.object({
  totalAccesses: z.number(),
  uniqueUsers: z.number(),
  uniqueDevices: z.number(),
  accessByMode: z.object({
    direct: z.number(),
    proxy: z.number(),
  }),
  errorRate: z.number(),
  avgResponseTimeMs: z.number().nullable(),
  recentEvents: z.array(secretAccessEventSchema),
})

export const projectAnalyticsResponseSchema = z.object({
  summary: projectAnalyticsSummarySchema,
  events: z.array(secretAccessEventSchema),
  scope: z
    .object({
      projectId: z.string(),
      effectiveRole: projectRoleSchema,
      granularity: z.enum(['hour', 'day', 'week']),
      from: nullableStringSchema,
      to: nullableStringSchema,
    })
    .optional(),
})

export const scopedProjectAnalyticsResponseSchema = z.object({
  summary: projectAnalyticsSummarySchema,
  events: z.array(secretAccessEventSchema),
  secretId: z.string().optional(),
  userId: z.string().optional(),
  tokenId: z.string().optional(),
})

export const projectTokensResponseSchema = z.object({
  tokens: z.array(proxyTokenSchema),
})

export const issueTokenResponseSchema = z.object({
  token: z.string(),
  tokenStart: z.string(),
  tokenHash: z.string(),
  userId: nullableStringSchema,
  secretId: z.string(),
  mode: secretModeSchema,
  expiresAt: z.string(),
})

export const batchIssueTokensResponseSchema = z.object({
  tokens: z.array(
    z.object({
      secretId: z.string(),
      rawToken: z.string(),
      tokenStart: z.string(),
      createdAt: z.string(),
    })
  ),
})

export const resolveBulkResponseSchema = z.object({
  resolved: z.array(
    z.object({
      token: z.string(),
      value: z.string(),
      secretName: z.string(),
    })
  ),
  denied: z.array(
    z.object({
      token: z.string(),
      code: z.string(),
    })
  ),
})

export const revokeTokenResponseSchema = z.object({
  revoked: z.boolean(),
  alreadyRevoked: z.boolean(),
  tokenStart: nullableStringSchema,
  revokedAt: nullableStringSchema,
})

export const accessRequestResponseSchema = z.object({
  request: accessRequestSchema,
})

export const secretAccessRequestResponseSchema = z.object({
  requested: z.literal(true),
})

export const listAccessRequestsResponseSchema = z.object({
  requests: z.array(accessRequestSchema),
})

export const notificationRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  data: metadataSchema,
  readAt: nullableStringSchema,
  actionTaken: nullableStringSchema,
  createdAt: z.string(),
})

export const notificationListResponseSchema = z.object({
  notifications: z.array(notificationRecordSchema),
  unreadCount: z.number(),
  nextCursor: nullableStringSchema,
})

export const orgInvitationResponseSchema = z.object({
  invitation: orgInvitationSchema,
  emailSent: z.boolean().optional(),
})

export const verifyInvitationResponseSchema = z.object({
  valid: z.boolean(),
  expired: z.boolean(),
  alreadyUsed: z.boolean(),
  status: orgInvitationSchema.shape.status.nullable(),
  organizationName: nullableStringSchema,
  invitedByName: nullableStringSchema,
  role: orgRoleSchema.nullable(),
  email: nullableStringSchema,
  expiresAt: nullableStringSchema,
})

export const userSearchResponseSchema = z.object({
  users: z.array(
    z.object({
      id: z.string(),
      name: nullableStringSchema,
      username: optionalNullableStringSchema,
      email: nullableStringSchema,
      image: optionalNullableStringSchema,
    })
  ),
})

export const auditListResponseSchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      eventType: z.string(),
      outcome: auditOutcomeSchema,
      actorUserId: nullableStringSchema,
      actorSessionId: nullableStringSchema,
      projectId: nullableStringSchema,
      secretId: nullableStringSchema,
      tokenId: nullableStringSchema,
      route: nullableStringSchema,
      sourceIp: nullableStringSchema,
      failureReason: nullableStringSchema,
      metadata: metadataSchema,
      occurredAt: z.string(),
    })
  ),
  nextCursor: nullableStringSchema,
})

export const securityAlertSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  secretId: nullableStringSchema,
  tokenId: nullableStringSchema,
  alertType: z.enum([
    'probable_leak',
    'rotation_recommended',
    'new_device',
    'new_location',
    'suspicious_auth_activity',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum([
    'open',
    'acknowledged',
    'investigating',
    'mitigated',
    'resolved',
    'closed_no_action',
  ]),
  ownerUserId: nullableStringSchema,
  ownerTeam: nullableStringSchema,
  source: z.string(),
  confidence: nullableStringSchema,
  title: z.string(),
  summary: z.string(),
  metadata: metadataSchema,
  assignedAt: nullableStringSchema,
  acknowledgedAt: nullableStringSchema,
  resolvedAt: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const rotationRecommendationSchema = z.object({
  id: z.string(),
  alertId: z.string(),
  projectId: z.string(),
  secretId: nullableStringSchema,
  recommendedAction: z.enum(['token_revoke', 'session_revoke', 'provider_secret_rotate']),
  provider: nullableStringSchema,
  status: securityAlertSchema.shape.status,
  rationale: z.string(),
  metadata: metadataSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const securityAlertsResponseSchema = z.object({
  alerts: z.array(securityAlertSchema),
})

export const rotationRecommendationsResponseSchema = z.object({
  recommendations: z.array(rotationRecommendationSchema),
})

export const createProbableLeakAlertResponseSchema = z.object({
  alert: securityAlertSchema,
  recommendation: rotationRecommendationSchema,
})

export const updateSecurityAlertResponseSchema = z.object({
  alert: securityAlertSchema,
})

export const createProjectInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
})

export const updateProjectInputSchema = z.object({
  name: z.string().trim().min(1).optional(),
  status: projectStatusSchema.optional(),
  showAllVariablesToMembers: z.boolean().optional(),
  requireAccessRequest: z.boolean().optional(),
  autoJoinForOrgMembers: z.boolean().optional(),
})

export const createProjectEnvironmentInputSchema = z.object({
  name: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  isDefault: z.boolean().optional(),
})

export const updateProjectSettingsInputSchema = z
  .object({
    accessMode: projectSettingsAccessModeSchema.optional(),
    defaultTtlSeconds: z.number().int().min(60).max(31_536_000).optional(),
    requireDeviceBinding: z.boolean().optional(),
    maxRequestsPerTokenPerDay: z.number().int().min(1).max(10_000_000).optional(),
    allowPersonalSecrets: z.boolean().optional(),
    requireMemberApprovalForSecretAccess: z.boolean().optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Provide at least one setting to update.',
  })

export const sendOrgInvitationInputSchema = z.object({
  email: z.string().trim().email(),
  role: canonicalOrgRoleSchema,
})
