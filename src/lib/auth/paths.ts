import { LOGIN_PATH } from '@/lib/constants'

export function buildLoginRedirectPath(nextPath?: string): string {
  const normalizedNext = normalizeNextPath(nextPath)

  if (!normalizedNext) {
    return LOGIN_PATH
  }

  const searchParams = new URLSearchParams({ next: normalizedNext })
  return `${LOGIN_PATH}?${searchParams.toString()}`
}

export function normalizeNextPath(candidate?: string | null): string | null {
  if (!candidate) {
    return null
  }

  if (!candidate.startsWith('/')) {
    return null
  }

  if (candidate.startsWith('//')) {
    return null
  }

  return candidate
}
