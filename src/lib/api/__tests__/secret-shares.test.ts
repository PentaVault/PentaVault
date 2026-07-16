import {
  accessSecretShareResponseSchema,
  createSecretShareInputSchema,
  createSecretShareResponseSchema,
  parseApiInput,
  parseApiResponse,
  secretSharesResponseSchema,
} from '@/lib/api/schemas'
import type {
  AccessSecretShareResponse,
  CreateSecretShareResponse,
  SecretSharesResponse,
} from '@/lib/types/api'

const share = {
  id: 'share_1',
  projectId: 'project_1',
  organizationId: 'org_1',
  secretId: 'secret_1',
  secretVersionId: 'secret_1:v2',
  secretName: 'STRIPE_KEY',
  name: 'Vendor handoff',
  tokenStart: 'pvs_example1',
  accessScope: 'recipients',
  authorizedEmails: ['vendor@example.com'],
  expiresAt: '2026-07-17T00:00:00.000Z',
  maxViews: 2,
  viewCount: 0,
  remainingViews: 2,
  lastViewedAt: null,
  revokedAt: null,
  revokedByUserId: null,
  createdByUserId: 'user_1',
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
  passwordProtected: true,
  status: 'active',
} as const

describe('secret share API schemas', () => {
  it('accepts sanitized manager and one-time creation responses', () => {
    const listed = parseApiResponse<SecretSharesResponse>(secretSharesResponseSchema, {
      shares: [share],
    })
    const created = parseApiResponse<CreateSecretShareResponse>(createSecretShareResponseSchema, {
      share,
      token: `pvs_${'a'.repeat(43)}`,
    })

    expect(listed.shares[0]?.remainingViews).toBe(2)
    expect(created.token).toMatch(/^pvs_/)
    expect(JSON.stringify(listed)).not.toContain(created.token)
  })

  it('fails closed on malformed bearer tokens and access payloads', () => {
    expect(() =>
      parseApiResponse(createSecretShareResponseSchema, { share, token: 'pvs_short' })
    ).toThrow()
    expect(() =>
      parseApiResponse<AccessSecretShareResponse>(accessSecretShareResponseSchema, {
        share: {
          id: share.id,
          name: share.name,
          secretName: share.secretName,
          accessScope: share.accessScope,
          expiresAt: share.expiresAt,
          maxViews: share.maxViews,
          remainingViews: -1,
          passwordProtected: true,
        },
        value: 'secret',
      })
    ).toThrow()
  })

  it('requires recipients only for recipient-scoped shares', () => {
    const valid = parseApiInput(createSecretShareInputSchema, {
      secretId: 'secret_1',
      expiresAt: '2026-07-17T00:00:00.000Z',
      accessScope: 'recipients',
      authorizedEmails: ['vendor@example.com'],
    })
    expect(valid.authorizedEmails).toEqual(['vendor@example.com'])

    expect(() =>
      parseApiInput(createSecretShareInputSchema, {
        secretId: 'secret_1',
        expiresAt: '2026-07-17T00:00:00.000Z',
        accessScope: 'recipients',
        authorizedEmails: [],
      })
    ).toThrow()
    expect(() =>
      parseApiInput(createSecretShareInputSchema, {
        secretId: 'secret_1',
        expiresAt: '2026-07-17T00:00:00.000Z',
        accessScope: 'anyone',
        authorizedEmails: ['vendor@example.com'],
      })
    ).toThrow()
  })
})
