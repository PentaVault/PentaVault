import type { NotificationRecord } from '@/lib/types/api'
import type { ProxyToken, Secret, SecretAccessRequest, UserSecretAccess } from '@/lib/types/models'
import {
  buildPendingSecretRequestsByUser,
  buildPendingSecretRequestsByUserFromRecords,
} from '@/lib/utils/secret-access-requests'

const createdAt = '2026-05-04T08:00:00.000Z'

function secret(overrides: Partial<Secret> = {}): Secret {
  return {
    id: 'secret_1',
    projectId: 'project_1',
    environment: 'development',
    name: 'ABACUS_IGNORE_SSL',
    mode: 'compatibility',
    status: 'active',
    currentVersionId: 'version_1',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }
}

function token(overrides: Partial<ProxyToken> = {}): ProxyToken {
  return {
    formatVersion: 1,
    tokenPrefix: 'pv_tok_',
    tokenHashAlgorithm: 'sha256',
    tokenHash: 'hash_1',
    tokenStart: 'pv_tok_R61fGbGAj',
    mode: 'compatibility',
    secretId: 'secret_1',
    userId: 'user_1',
    issuedByUserId: 'admin_1',
    expiresAt: '2026-05-11T08:00:00.000Z',
    revokedAt: null,
    activeSessionId: null,
    rateLimitMax: null,
    rateLimitRemaining: null,
    rateLimitResetAt: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }
}

function secretAccessRequest(overrides: Partial<SecretAccessRequest> = {}): SecretAccessRequest {
  return {
    id: 'request_1',
    projectId: 'project_1',
    secretId: 'secret_1',
    requesterId: 'user_1',
    status: 'pending',
    reviewedByUserId: null,
    reviewerNote: null,
    reviewedAt: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }
}

function secretAccess(overrides: Partial<UserSecretAccess> = {}): UserSecretAccess {
  return {
    id: 'access_1',
    projectId: 'project_1',
    userId: 'user_1',
    secretId: 'secret_1',
    environmentId: null,
    accessLevel: 'read',
    status: 'active',
    grantedBy: 'admin_1',
    revokedBy: null,
    expiresAt: null,
    grantedAt: createdAt,
    revokedAt: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }
}

function notification(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    id: 'notification_1',
    userId: 'admin_1',
    type: 'secret_access_request',
    title: 'Variable access requested',
    body: 'A member requested access.',
    data: {
      projectId: 'project_1',
      secretId: 'secret_1',
      secretName: 'ABACUS_IGNORE_SSL',
      requesterId: 'user_1',
      requestStatus: 'pending',
    },
    readAt: null,
    actionTaken: null,
    createdAt,
    ...overrides,
  }
}

describe('buildPendingSecretRequestsByUser', () => {
  it('keeps pending secret requests without an assignment', () => {
    const pending = buildPendingSecretRequestsByUser({
      notifications: [notification()],
      projectId: 'project_1',
      secrets: [secret()],
      tokens: [],
    })

    expect(pending.get('user_1')).toEqual([
      expect.objectContaining({
        secretId: 'secret_1',
        secretName: 'ABACUS_IGNORE_SSL',
        requesterId: 'user_1',
      }),
    ])
  })

  it('removes pending secret requests once a proxy token exists', () => {
    const pending = buildPendingSecretRequestsByUser({
      notifications: [notification()],
      projectId: 'project_1',
      secrets: [secret()],
      tokens: [token()],
    })

    expect(pending.get('user_1')).toBeUndefined()
  })

  it('removes stale pending requests after an approval status notification', () => {
    const pending = buildPendingSecretRequestsByUser({
      notifications: [
        notification(),
        notification({
          id: 'notification_approved',
          userId: 'user_1',
          type: 'secret_access_status',
          data: {
            projectId: 'project_1',
            secretId: 'secret_1',
            secretName: 'ABACUS_IGNORE_SSL',
            requestStatus: 'approved',
          },
        }),
      ],
      projectId: 'project_1',
      secrets: [secret()],
      tokens: [],
    })

    expect(pending.get('user_1')).toBeUndefined()
  })

  it('removes stale pending requests after a rejection status notification', () => {
    const pending = buildPendingSecretRequestsByUser({
      notifications: [
        notification(),
        notification({
          id: 'notification_rejected',
          userId: 'user_1',
          type: 'secret_access_status',
          data: {
            projectId: 'project_1',
            secretId: 'secret_1',
            secretName: 'ABACUS_IGNORE_SSL',
            requestStatus: 'rejected',
          },
        }),
      ],
      projectId: 'project_1',
      secrets: [secret()],
      tokens: [],
    })

    expect(pending.get('user_1')).toBeUndefined()
  })

  it('uses access grants instead of active tokens when request records are available', () => {
    const pending = buildPendingSecretRequestsByUserFromRecords({
      access: [secretAccess()],
      requests: [secretAccessRequest()],
      secrets: [secret()],
      tokens: [token({ revokedAt: '2026-05-05T08:00:00.000Z' })],
    })

    expect(pending.get('user_1')).toBeUndefined()
  })
})
