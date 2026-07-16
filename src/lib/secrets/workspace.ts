import type { Secret } from '@/lib/types/models'

export type SecretWorkspaceFilter = {
  environmentId?: string | null
  environmentSlug?: string
  folderPath?: string
  tag?: string
  search?: string
}

export function filterSecretsForWorkspace(
  secrets: Secret[],
  filter: SecretWorkspaceFilter
): Secret[] {
  const query = filter.search?.trim().toLowerCase() ?? ''

  return secrets.filter((secret) => {
    if (filter.environmentId) {
      const matchesEnvironment = secret.environmentId
        ? secret.environmentId === filter.environmentId
        : Boolean(filter.environmentSlug && secret.environment === filter.environmentSlug)
      if (!matchesEnvironment) return false
    } else if (filter.environmentSlug && secret.environment !== filter.environmentSlug) {
      return false
    }

    if (
      filter.folderPath &&
      filter.folderPath !== '*' &&
      (secret.folderPath ?? '/') !== filter.folderPath
    ) {
      return false
    }
    if (filter.tag && filter.tag !== '*' && !(secret.tags ?? []).includes(filter.tag)) {
      return false
    }
    if (!query) return true

    return [
      secret.name,
      secret.description ?? '',
      secret.folderPath ?? '/',
      ...(secret.tags ?? []),
    ].some((value) => value.toLowerCase().includes(query))
  })
}

export function getSecretWorkspaceFacets(secrets: Secret[]): {
  folders: string[]
  tags: string[]
} {
  return {
    folders: [...new Set(secrets.map((secret) => secret.folderPath ?? '/'))].sort((left, right) =>
      left.localeCompare(right)
    ),
    tags: [...new Set(secrets.flatMap((secret) => secret.tags ?? []))].sort((left, right) =>
      left.localeCompare(right)
    ),
  }
}

export function parseSecretTagInput(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    ),
  ].sort()
}
