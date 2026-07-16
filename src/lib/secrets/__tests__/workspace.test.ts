import {
  filterSecretsForWorkspace,
  getSecretWorkspaceFacets,
  parseSecretTagInput,
} from '@/lib/secrets/workspace'
import type { Secret } from '@/lib/types/models'

function secret(overrides: Partial<Secret>): Secret {
  return {
    id: 'secret_default',
    projectId: 'project_123',
    environment: 'development',
    name: 'DATABASE_URL',
    mode: 'compatibility',
    status: 'active',
    currentVersionId: 'version_1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('secret workspace', () => {
  const secrets = [
    secret({
      id: 'secret_database',
      environmentId: 'env_prod',
      environment: 'production',
      folderPath: '/services/api',
      description: 'Primary relational database',
      tags: ['database', 'production'],
    }),
    secret({
      id: 'secret_worker',
      name: 'QUEUE_TOKEN',
      folderPath: '/services/worker',
      tags: ['worker'],
    }),
    secret({ id: 'secret_legacy', name: 'LEGACY_KEY', environment: 'production' }),
  ]

  it('combines environment, folder, tag, and metadata search filters', () => {
    expect(
      filterSecretsForWorkspace(secrets, {
        environmentId: 'env_prod',
        environmentSlug: 'production',
        folderPath: '/services/api',
        tag: 'production',
        search: 'relational',
      }).map((entry) => entry.id)
    ).toEqual(['secret_database'])
  })

  it('keeps legacy environment records discoverable by slug', () => {
    expect(
      filterSecretsForWorkspace(secrets, {
        environmentId: 'env_prod',
        environmentSlug: 'production',
        search: 'legacy',
      }).map((entry) => entry.id)
    ).toEqual(['secret_legacy'])
  })

  it('derives stable folder and tag facets with root fallbacks', () => {
    expect(getSecretWorkspaceFacets(secrets)).toEqual({
      folders: ['/', '/services/api', '/services/worker'],
      tags: ['database', 'production', 'worker'],
    })
  })

  it('normalizes and deduplicates tag input', () => {
    expect(parseSecretTagInput(' Production, database, production, Worker ')).toEqual([
      'database',
      'production',
      'worker',
    ])
  })
})
