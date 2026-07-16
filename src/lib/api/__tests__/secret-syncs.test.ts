import {
  createSecretSyncInputSchema,
  parseApiInput,
  parseApiResponse,
  secretSyncDeliveriesResponseSchema,
  secretSyncsResponseSchema,
} from '@/lib/api/schemas'
import type { SecretSyncDeliveriesResponse, SecretSyncsResponse } from '@/lib/types/api'

const sync = {
  id: 'sync_1',
  projectId: 'project_1',
  environmentId: 'env_prod',
  name: 'Production actions',
  provider: 'github',
  destinationConfig: { scope: 'repository', owner: 'acme', repository: 'web' },
  credentialHint: '••••alue',
  credentialConfigured: true,
  folderPath: '/services',
  autoSyncEnabled: true,
  enabled: true,
  maxAttempts: 5,
  lastStatus: 'succeeded',
  lastSyncedAt: '2026-07-16T12:00:00.000Z',
  lastError: null,
  createdByUserId: 'user_1',
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T12:00:00.000Z',
} as const

describe('secret sync API schemas', () => {
  it('accepts sanitized configuration and value-free delivery history', () => {
    const listed = parseApiResponse<SecretSyncsResponse>(secretSyncsResponseSchema, {
      syncs: [sync],
      supportedProviders: ['github', 'vercel'],
    })
    const deliveries = parseApiResponse<SecretSyncDeliveriesResponse>(
      secretSyncDeliveriesResponseSchema,
      {
        deliveries: [
          {
            id: 'delivery_1',
            syncId: sync.id,
            projectId: sync.projectId,
            reason: 'automatic',
            status: 'succeeded',
            attemptCount: 1,
            nextAttemptAt: null,
            lastAttemptAt: sync.lastSyncedAt,
            completedAt: sync.lastSyncedAt,
            secretCount: 4,
            changedCount: 1,
            lastError: null,
            createdAt: sync.lastSyncedAt,
            updatedAt: sync.lastSyncedAt,
          },
        ],
      }
    )
    expect(listed.syncs[0]?.credentialHint).toBe('••••alue')
    expect(deliveries.deliveries[0]?.changedCount).toBe(1)
    expect(JSON.stringify({ listed, deliveries })).not.toContain('secret-value')
  })

  it('validates provider-specific destinations and credentials', () => {
    expect(
      parseApiInput(createSecretSyncInputSchema, {
        name: 'Vercel production',
        provider: 'vercel',
        credential: 'provider-token',
        destinationConfig: { project: 'web', targets: ['production'] },
        folderPath: '/',
      }).provider
    ).toBe('vercel')
    expect(() =>
      parseApiInput(createSecretSyncInputSchema, {
        name: 'Invalid GitHub',
        provider: 'github',
        credential: '',
        destinationConfig: { project: 'web', targets: [] },
        folderPath: '/',
      })
    ).toThrow()
    const sanitized = parseApiResponse(secretSyncsResponseSchema, {
      syncs: [{ ...sync, credential: 'must-not-be-returned' }],
      supportedProviders: ['github'],
    })
    expect(JSON.stringify(sanitized)).not.toContain('must-not-be-returned')
  })
})
