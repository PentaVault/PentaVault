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
    plan: z.string().optional(),
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
  (role) =>
    role === 'owner' || role === 'admin'
      ? 'admin'
      : role === 'developer' || role === 'readonly'
        ? 'member'
        : role,
  z.enum(PROJECT_ROLES)
)
const projectStatusSchema = z.enum(PROJECT_STATUSES)
const secretModeSchema = z.enum(SECRET_MODES)
const secretEncryptionModeSchema = z.enum(['encrypted', 'plaintext'])
const secretScopeSchema = z.enum(['project', 'personal'])
const secretStatusSchema = z.enum(SECRET_STATUSES)
const secretVersionStateSchema = z.enum(['active', 'superseded', 'compromised', 'destroyed'])
const auditOutcomeSchema = z.enum(AUDIT_OUTCOMES)
const projectSettingsAccessModeSchema = z.enum(['proxy', 'direct', 'both'])
const secretAccessModeSchema = z.enum(['direct', 'proxy'])
const userSecretAccessLevelSchema = z.enum(['read'])
const userSecretAccessStatusSchema = z.enum(['active', 'expired', 'revoked'])
const personalSecretPromotionRequestStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'cancelled',
])
const secretAccessRequestStatusSchema = z.enum(['pending', 'approved', 'rejected', 'cancelled'])

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
  groupRole: z.enum(['admin', 'member', 'readonly']).nullable().optional(),
  pendingAccessRequest: z.boolean(),
  latestRequestStatus: z
    .enum(['pending', 'approved', 'denied', 'rejected', 'cancelled'])
    .nullable(),
  latestAccessRequest: accessRequestSchema.nullable(),
})

export const accessGroupSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: nullableStringSchema,
  createdByUserId: nullableStringSchema,
  memberCount: z.number().int().nonnegative(),
  projectCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const accessGroupMemberSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  userId: z.string(),
  addedByUserId: nullableStringSchema,
  createdAt: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: nullableStringSchema,
  }),
})

export const projectAccessGroupGrantSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  groupId: z.string(),
  role: z.enum(['admin', 'member', 'readonly']),
  grantedByUserId: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  group: accessGroupSchema
    .pick({ id: true, name: true, slug: true, organizationId: true })
    .optional(),
})

export const accessGroupsResponseSchema = z.object({ groups: z.array(accessGroupSchema) })
export const accessGroupResponseSchema = z.object({ group: accessGroupSchema })
export const accessGroupMembersResponseSchema = z.object({
  members: z.array(accessGroupMemberSchema),
})
export const projectAccessGroupsResponseSchema = z.object({
  groups: z.array(accessGroupSchema),
  grants: z.array(projectAccessGroupGrantSchema),
})
export const projectAccessGroupGrantResponseSchema = z.object({
  grant: projectAccessGroupGrantSchema,
})
export const createAccessGroupInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(300).nullable().optional(),
})
export const updateAccessGroupInputSchema = createAccessGroupInputSchema.partial()
export const grantProjectAccessGroupInputSchema = z.strictObject({
  role: z.enum(['admin', 'member', 'readonly']),
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
  expiresAt: nullableStringSchema,
  createdAt: z.string(),
})

export const projectEnvironmentsResponseSchema = z.object({
  environments: z.array(projectEnvironmentSchema),
})

export const projectEnvironmentResponseSchema = z.object({
  environment: projectEnvironmentSchema,
})

export const projectConfigSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  environmentId: z.string(),
  parentConfigId: nullableStringSchema,
  type: z.enum(['root', 'branch']),
  name: z.string(),
  slug: z.string(),
  isProtected: z.boolean(),
  isPersonalDefault: z.boolean().optional(),
  visibility: z.enum(['protected', 'private', 'shared']).optional(),
  canEdit: z.boolean().optional(),
  canShare: z.boolean().optional(),
  sharedWith: z
    .array(
      z.object({
        configId: z.string(),
        userId: z.string(),
        sharedByUserId: nullableStringSchema,
        permission: z.literal('read'),
        createdAt: z.string(),
      })
    )
    .optional(),
  createdByUserId: optionalNullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const projectConfigsResponseSchema = z.object({
  configs: z.array(projectConfigSchema),
})

export const projectConfigResponseSchema = z.object({
  config: projectConfigSchema,
})

export const deleteProjectConfigResponseSchema = z.object({
  deleted: z.boolean(),
  configId: z.string(),
})

export const projectConfigShareResponseSchema = z.object({
  share: z.object({
    configId: z.string(),
    userId: z.string(),
    sharedByUserId: nullableStringSchema,
    permission: z.literal('read'),
    createdAt: z.string(),
  }),
})

const configChangeRequestItemSchema = z.object({
  id: z.string(),
  changeRequestId: z.string(),
  operation: z.enum(['create', 'update', 'delete']),
  secretName: z.string(),
  currentSecretId: nullableStringSchema,
  proposedSecretId: nullableStringSchema,
  createdAt: z.string(),
})

const configChangeRequestApprovalSchema = z.object({
  id: z.string(),
  changeRequestId: z.string(),
  reviewerUserId: z.string(),
  status: z.enum(['approved', 'rescinded']),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const configChangeRequestSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  projectId: z.string(),
  sourceConfigId: nullableStringSchema,
  targetConfigId: z.string(),
  title: z.string(),
  description: nullableStringSchema,
  status: z.enum(['draft', 'in_review', 'approved', 'merged', 'cancelled', 'closed']),
  requestedByUserId: z.string(),
  mergedByUserId: nullableStringSchema,
  mergedAt: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(configChangeRequestItemSchema),
  approvals: z.array(configChangeRequestApprovalSchema),
})

export const configChangeRequestsResponseSchema = z.object({
  requests: z.array(configChangeRequestSchema),
})

export const configChangeRequestResponseSchema = z.object({
  request: configChangeRequestSchema.nullable(),
})

export const projectMemberEnvironmentAccessSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  environmentId: z.string(),
  grantedBy: z.string(),
  grantedAt: z.string(),
})

export const projectMemberEnvironmentAccessResponseSchema = z.object({
  access: z.array(projectMemberEnvironmentAccessSchema),
})

export const projectSettingsSchema = z.object({
  projectId: z.string(),
  accessMode: projectSettingsAccessModeSchema,
  defaultTtlSeconds: z.number(),
  requireDeviceBinding: z.boolean(),
  maxRequestsPerTokenPerDay: z.number(),
  allowPersonalSecrets: z.boolean(),
  requireMemberApprovalForSecretAccess: z.boolean(),
  requiredChangeRequestApprovals: z.number().int().min(1).max(5),
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
  configId: optionalNullableStringSchema,
  name: z.string(),
  description: optionalNullableStringSchema,
  folderPath: z.string().optional(),
  tags: z.array(z.string()).optional(),
  mode: secretModeSchema,
  encryptionMode: secretEncryptionModeSchema.optional(),
  isSensitive: z.boolean().optional(),
  scope: secretScopeSchema.optional(),
  status: secretStatusSchema,
  currentVersionId: z.string(),
  createdByUserId: optionalNullableStringSchema,
  promotedFromSecretId: optionalNullableStringSchema,
  version: z.number().optional(),
  lastRotatedAt: optionalNullableStringSchema,
  rotationIntervalDays: z.number().int().nullable().optional(),
  rotationReminderDays: z.number().int().nullable().optional(),
  nextRotationAt: optionalNullableStringSchema,
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
  revokedTokenCount: z.number().optional(),
})

export const rejectSecretAccessRequestResponseSchema = z.object({
  rejected: z.boolean(),
})

export const secretAccessRequestRecordSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  secretId: z.string(),
  requesterId: z.string(),
  status: secretAccessRequestStatusSchema,
  reviewedByUserId: nullableStringSchema,
  reviewerNote: nullableStringSchema,
  reviewedAt: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
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

export const secretVersionSchema = z.object({
  id: z.string(),
  secretId: z.string(),
  versionNumber: z.number(),
  state: secretVersionStateSchema,
  createdByUserId: optionalNullableStringSchema,
  createdFrom: z.string().optional(),
  restoredFromVersionId: optionalNullableStringSchema,
  supersededAt: optionalNullableStringSchema,
  supersededByVersionId: optionalNullableStringSchema,
  compromisedAt: optionalNullableStringSchema,
  compromiseReason: optionalNullableStringSchema,
  envelopeVersion: z.number().optional(),
  envelopeAlgorithm: z.string().optional(),
  wrappedKeyProvider: z.string().optional(),
  wrappedKeyRef: z.string().optional(),
  wrappedKeyAlgorithm: z.string().optional(),
  createdAt: z.string(),
})

export const secretVersionsResponseSchema = z.object({
  versions: z.array(secretVersionSchema),
  retentionMonths: z.number(),
})

export const restoreSecretVersionResponseSchema = z.object({
  secret: secretSchema,
  currentVersion: secretVersionSchema,
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

export const issueTokenInputSchema = z.strictObject({
  secretId: z.string().trim().min(1),
  environmentId: z.string().trim().min(1).optional(),
  userId: z.string().trim().min(1).optional(),
  mode: z.enum(['compatibility', 'gateway']),
  expiresAt: z.iso.datetime().optional(),
  activeSessionId: z.string().trim().min(1).optional(),
  maxRequestsPerSecond: z.number().int().min(1).max(10_000).optional(),
  maxRequestsTotal: z.number().int().min(1).max(1_000_000_000).optional(),
  deviceFingerprint: z.string().trim().min(8).max(256).optional(),
  allowedIps: z.array(z.string().trim().min(2).max(45)).max(32).optional(),
  ttlSeconds: z.number().int().min(60).max(31_536_000).optional(),
  rateLimitMax: z.number().int().positive().optional(),
  rateLimitRemaining: z.number().int().min(0).optional(),
  rateLimitResetAt: z.iso.datetime().optional(),
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
  request: secretAccessRequestRecordSchema.nullable().optional(),
})

export const secretAccessRequestsResponseSchema = z.object({
  requests: z.array(secretAccessRequestRecordSchema),
})

export const cancelSecretAccessRequestResponseSchema = z.object({
  cancelled: z.boolean(),
  request: secretAccessRequestRecordSchema.nullable(),
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

export const webhookEventTypeSchema = z.enum([
  'secrets.created',
  'secrets.updated',
  'secrets.deleted',
  'secrets.metadata_updated',
  'secrets.version_restored',
])

export const webhookDeliveryStatusSchema = z.enum([
  'pending',
  'processing',
  'retry_scheduled',
  'succeeded',
  'dead_letter',
])

export const outboundWebhookSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  environmentId: nullableStringSchema,
  name: z.string(),
  endpointHost: z.string(),
  folderPath: z.string(),
  eventTypes: z.array(webhookEventTypeSchema),
  enabled: z.boolean(),
  maxAttempts: z.number().int(),
  lastStatus: webhookDeliveryStatusSchema.nullable(),
  lastDeliveryAt: nullableStringSchema,
  lastError: nullableStringSchema,
  createdByUserId: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  hasSigningSecret: z.boolean(),
})

export const webhookDeliverySchema = z.object({
  id: z.string(),
  webhookId: z.string(),
  projectId: z.string(),
  eventId: z.string(),
  eventType: z.string(),
  payload: metadataSchema,
  status: webhookDeliveryStatusSchema,
  attemptCount: z.number().int(),
  nextAttemptAt: nullableStringSchema,
  lastAttemptAt: nullableStringSchema,
  deliveredAt: nullableStringSchema,
  responseStatus: z.number().int().nullable(),
  lastError: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const webhooksResponseSchema = z.object({
  webhooks: z.array(outboundWebhookSchema),
  supportedEvents: z.array(webhookEventTypeSchema),
})

export const webhookResponseSchema = z.object({ webhook: outboundWebhookSchema })
export const webhookDeliveriesResponseSchema = z.object({
  deliveries: z.array(webhookDeliverySchema),
})
export const webhookDeliveryResponseSchema = z.object({ delivery: webhookDeliverySchema })

export const secretSyncProviderSchema = z.enum(['github', 'vercel'])
export const githubSecretSyncDestinationSchema = z.object({
  scope: z.enum(['repository', 'environment']),
  owner: z.string().trim().min(1).max(100),
  repository: z.string().trim().min(1).max(100),
  environment: z.string().trim().min(1).max(255).optional(),
})
export const vercelSecretSyncDestinationSchema = z.object({
  project: z.string().trim().min(1).max(160),
  teamId: z.string().trim().min(1).max(160).optional(),
  targets: z
    .array(z.enum(['production', 'preview', 'development']))
    .min(1)
    .max(3),
  gitBranch: z.string().trim().min(1).max(250).optional(),
})
export const secretSyncSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  environmentId: nullableStringSchema,
  name: z.string(),
  provider: secretSyncProviderSchema,
  destinationConfig: z.union([
    githubSecretSyncDestinationSchema,
    vercelSecretSyncDestinationSchema,
  ]),
  credentialHint: z.string(),
  credentialConfigured: z.literal(true),
  folderPath: z.string(),
  autoSyncEnabled: z.boolean(),
  enabled: z.boolean(),
  maxAttempts: z.number().int().min(1).max(10),
  lastStatus: webhookDeliveryStatusSchema.nullable(),
  lastSyncedAt: nullableStringSchema,
  lastError: nullableStringSchema,
  createdByUserId: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})
export const secretSyncDeliverySchema = z.object({
  id: z.string(),
  syncId: z.string(),
  projectId: z.string(),
  reason: z.enum(['manual', 'automatic']),
  status: webhookDeliveryStatusSchema,
  attemptCount: z.number().int().min(0),
  nextAttemptAt: nullableStringSchema,
  lastAttemptAt: nullableStringSchema,
  completedAt: nullableStringSchema,
  secretCount: z.number().int().min(0).nullable(),
  changedCount: z.number().int().min(0).nullable(),
  lastError: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})
export const secretSyncsResponseSchema = z.object({
  syncs: z.array(secretSyncSchema),
  supportedProviders: z.array(secretSyncProviderSchema),
})
export const secretSyncResponseSchema = z.object({ sync: secretSyncSchema })
export const secretSyncDeliveriesResponseSchema = z.object({
  deliveries: z.array(secretSyncDeliverySchema),
})
export const secretSyncDeliveryResponseSchema = z.object({ delivery: secretSyncDeliverySchema })
const secretSyncCommonInputSchema = {
  name: z.string().trim().min(1).max(120),
  credential: z.string().trim().min(1).max(4096),
  environmentId: z.string().trim().min(1).nullable().optional(),
  folderPath: z.string().trim().min(1).max(256),
  autoSyncEnabled: z.boolean().optional(),
  enabled: z.boolean().optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
}
export const createSecretSyncInputSchema = z.discriminatedUnion('provider', [
  z.object({
    ...secretSyncCommonInputSchema,
    provider: z.literal('github'),
    destinationConfig: githubSecretSyncDestinationSchema,
  }),
  z.object({
    ...secretSyncCommonInputSchema,
    provider: z.literal('vercel'),
    destinationConfig: vercelSecretSyncDestinationSchema,
  }),
])
export const updateSecretSyncInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    credential: z.string().trim().min(1).max(4096).optional(),
    destinationConfig: z
      .union([githubSecretSyncDestinationSchema, vercelSecretSyncDestinationSchema])
      .optional(),
    environmentId: z.string().trim().min(1).nullable().optional(),
    folderPath: z.string().trim().min(1).max(256).optional(),
    autoSyncEnabled: z.boolean().optional(),
    enabled: z.boolean().optional(),
    maxAttempts: z.number().int().min(1).max(10).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined))

export const secretShareAccessScopeSchema = z.enum(['anyone', 'organization', 'recipients'])
export const secretShareStatusSchema = z.enum(['active', 'consumed', 'expired', 'revoked'])

export const secretShareSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  organizationId: z.string(),
  secretId: z.string(),
  secretVersionId: z.string(),
  secretName: z.string(),
  name: nullableStringSchema,
  tokenStart: z.string(),
  accessScope: secretShareAccessScopeSchema,
  authorizedEmails: z.array(z.email()),
  expiresAt: z.string(),
  maxViews: z.number().int().min(1).max(100),
  viewCount: z.number().int().min(0),
  remainingViews: z.number().int().min(0),
  lastViewedAt: nullableStringSchema,
  revokedAt: nullableStringSchema,
  revokedByUserId: nullableStringSchema,
  createdByUserId: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  passwordProtected: z.boolean(),
  status: secretShareStatusSchema,
})

export const publicSecretShareSchema = secretShareSchema.pick({
  id: true,
  name: true,
  secretName: true,
  accessScope: true,
  expiresAt: true,
  maxViews: true,
  remainingViews: true,
  passwordProtected: true,
})

export const secretSharesResponseSchema = z.object({ shares: z.array(secretShareSchema) })
export const createSecretShareResponseSchema = z.object({
  share: secretShareSchema,
  token: z.string().regex(/^pvs_[A-Za-z0-9_-]{43}$/),
})
export const secretShareResponseSchema = z.object({ share: secretShareSchema })
export const publicSecretShareResponseSchema = z.object({ share: publicSecretShareSchema })
export const accessSecretShareResponseSchema = publicSecretShareResponseSchema.extend({
  value: z.string(),
})

export const createSecretShareInputSchema = z
  .object({
    secretId: z.string().trim().min(1),
    name: z.string().trim().min(1).max(120).nullable().optional(),
    expiresAt: z.iso.datetime(),
    maxViews: z.number().int().min(1).max(100).default(1),
    password: z.string().min(8).max(256).nullable().optional(),
    accessScope: secretShareAccessScopeSchema.default('anyone'),
    authorizedEmails: z.array(z.email()).max(50).default([]),
  })
  .superRefine((input, context) => {
    if (input.accessScope === 'recipients' && input.authorizedEmails.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['authorizedEmails'],
        message: 'Add at least one recipient email.',
      })
    }
    if (input.accessScope !== 'recipients' && input.authorizedEmails.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['authorizedEmails'],
        message: 'Recipient emails require recipient-only access.',
      })
    }
  })

export const createWebhookInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  endpointUrl: z.string().trim().url().max(2_048),
  signingSecret: z.string().trim().min(16).max(512).optional(),
  environmentId: z.string().trim().min(1).nullable().optional(),
  folderPath: z.string().trim().min(1).max(256),
  eventTypes: z.array(webhookEventTypeSchema).min(1).max(10),
  enabled: z.boolean().optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
})

export const updateWebhookInputSchema = createWebhookInputSchema
  .partial()
  .extend({ signingSecret: z.string().trim().min(16).max(512).nullable().optional() })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Provide at least one webhook field to update.',
  })

export const secretValueConstraintSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('regex'),
    pattern: z.string().trim().min(1).max(512),
    description: z.string().trim().max(200).optional(),
  }),
  z.object({ type: z.literal('min_length'), value: z.number().int().min(1).max(8192) }),
  z.object({ type: z.literal('max_length'), value: z.number().int().min(1).max(8192) }),
  z.object({ type: z.literal('disallow_whitespace') }),
  z.object({
    type: z.literal('allowed_values'),
    values: z.array(z.string().min(1).max(1024)).min(1).max(64),
  }),
  z.object({ type: z.literal('prevent_value_reuse'), versions: z.number().int().min(1).max(20) }),
])

export const secretValidationRuleSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  environmentId: nullableStringSchema,
  folderPath: z.string(),
  namePattern: nullableStringSchema,
  constraints: z.array(secretValueConstraintSchema),
  enabled: z.boolean(),
  createdByUserId: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const secretValidationRulesResponseSchema = z.object({
  rules: z.array(secretValidationRuleSchema),
})
export const secretValidationRuleResponseSchema = z.object({
  rule: secretValidationRuleSchema,
})

export const createSecretValidationRuleInputSchema = z.object({
  name: z.string().trim().min(1).max(64),
  environmentId: z.string().trim().min(1).nullable().optional(),
  folderPath: z.string().trim().min(1).max(256).optional(),
  namePattern: z.string().trim().min(1).max(512).nullable().optional(),
  constraints: z.array(secretValueConstraintSchema).min(1).max(12),
  enabled: z.boolean().optional(),
})

export const updateSecretValidationRuleInputSchema = createSecretValidationRuleInputSchema
  .partial()
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Provide at least one field to update.',
  })

export const secretSnapshotEntrySchema = z.object({
  secretId: z.string(),
  versionId: z.string(),
  name: z.string(),
})

export const secretSnapshotSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  configId: nullableStringSchema,
  environmentId: nullableStringSchema,
  folderPath: z.string(),
  label: nullableStringSchema,
  entries: z.array(secretSnapshotEntrySchema),
  secretCount: z.number().int(),
  createdByUserId: nullableStringSchema,
  createdAt: z.string(),
})

export const secretSnapshotsResponseSchema = z.object({
  snapshots: z.array(secretSnapshotSchema),
})
export const secretSnapshotResponseSchema = z.object({ snapshot: secretSnapshotSchema })
export const restoreSecretSnapshotResponseSchema = z.object({
  restored: z.number().int(),
  skipped: z.array(z.object({ secretId: z.string(), name: z.string() })),
})

export const createSecretSnapshotInputSchema = z.object({
  configId: z.string().trim().min(1),
  environmentId: z.string().trim().min(1).nullable().optional(),
  folderPath: z.string().trim().min(1).max(256).optional(),
  label: z.string().trim().min(1).max(120).nullable().optional(),
})

export const auditLogStreamSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  endpointUrl: z.string(),
  endpointHost: z.string(),
  hasToken: z.boolean(),
  enabled: z.boolean(),
  lastStatus: z.number().int().nullable(),
  lastDeliveryAt: nullableStringSchema,
  lastError: nullableStringSchema,
  createdByUserId: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const auditLogStreamsResponseSchema = z.object({
  streams: z.array(auditLogStreamSchema),
})
export const auditLogStreamResponseSchema = z.object({ stream: auditLogStreamSchema })

export const createAuditLogStreamInputSchema = z.object({
  name: z.string().trim().min(1).max(64),
  endpointUrl: z.string().trim().url().max(2_048),
  authToken: z.string().trim().min(1).max(1_024).nullable().optional(),
  enabled: z.boolean().optional(),
})

export const updateAuditLogStreamInputSchema = createAuditLogStreamInputSchema
  .partial()
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Provide at least one field to update.',
  })

export const appConnectionProviderSchema = z.enum([
  'github',
  'vercel',
  'aws',
  'gcp',
  'openai',
  'anthropic',
  'generic',
])

export const appConnectionSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  provider: appConnectionProviderSchema,
  hasCredential: z.boolean(),
  metadata: z.record(z.string(), z.unknown()),
  createdByUserId: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const appConnectionsResponseSchema = z.object({
  connections: z.array(appConnectionSchema),
})
export const appConnectionResponseSchema = z.object({ connection: appConnectionSchema })

export const createAppConnectionInputSchema = z.object({
  name: z.string().trim().min(1).max(64),
  provider: appConnectionProviderSchema,
  credential: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateAppConnectionInputSchema = z
  .object({
    name: z.string().trim().min(1).max(64).optional(),
    credential: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Provide at least one field to update.',
  })

export const dynamicSecretLeaseStatusSchema = z.enum(['active', 'revoked', 'expired'])

export const dynamicSecretSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  environmentId: nullableStringSchema,
  name: z.string(),
  provider: z.literal('generated'),
  config: z.record(z.string(), z.unknown()),
  defaultTtlSeconds: z.number().int(),
  maxTtlSeconds: z.number().int(),
  enabled: z.boolean(),
  createdByUserId: nullableStringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const dynamicSecretLeaseSchema = z.object({
  id: z.string(),
  dynamicSecretId: z.string(),
  projectId: z.string(),
  status: dynamicSecretLeaseStatusSchema,
  expiresAt: z.string(),
  revokedAt: nullableStringSchema,
  createdByUserId: nullableStringSchema,
  createdAt: z.string(),
})

export const dynamicSecretsResponseSchema = z.object({
  dynamicSecrets: z.array(dynamicSecretSchema),
})
export const dynamicSecretResponseSchema = z.object({ dynamicSecret: dynamicSecretSchema })
export const dynamicSecretLeasesResponseSchema = z.object({
  leases: z.array(dynamicSecretLeaseSchema),
})
export const dynamicSecretLeaseResponseSchema = z.object({ lease: dynamicSecretLeaseSchema })
export const issueDynamicSecretLeaseResponseSchema = z.object({
  lease: dynamicSecretLeaseSchema,
  credential: z.string(),
})

export const createDynamicSecretInputSchema = z.object({
  name: z.string().trim().min(1).max(64),
  environmentId: z.string().trim().min(1).nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  defaultTtlSeconds: z.number().int().min(60).max(2_592_000).optional(),
  maxTtlSeconds: z.number().int().min(60).max(2_592_000).optional(),
  enabled: z.boolean().optional(),
})

export const updateDynamicSecretInputSchema = createDynamicSecretInputSchema
  .partial()
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Provide at least one field to update.',
  })

export const issueDynamicSecretLeaseInputSchema = z.object({
  ttlSeconds: z.number().int().min(60).max(2_592_000).optional(),
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
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
})

export const createProjectConfigInputSchema = z.object({
  environmentId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/),
  parentConfigId: z.string().trim().min(1).nullable().optional(),
})

export const replaceProjectMemberEnvironmentAccessInputSchema = z.object({
  environmentIds: z.array(z.string().trim().min(1)).max(50),
})

export const updateProjectSettingsInputSchema = z
  .object({
    accessMode: projectSettingsAccessModeSchema.optional(),
    defaultTtlSeconds: z.number().int().min(60).max(31_536_000).optional(),
    requireDeviceBinding: z.boolean().optional(),
    maxRequestsPerTokenPerDay: z.number().int().min(1).max(10_000_000).optional(),
    allowPersonalSecrets: z.boolean().optional(),
    requireMemberApprovalForSecretAccess: z.boolean().optional(),
    requiredChangeRequestApprovals: z.number().int().min(1).max(5).optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Provide at least one setting to update.',
  })

export const sendOrgInvitationInputSchema = z.object({
  email: z.string().trim().email(),
  role: canonicalOrgRoleSchema,
})
