import axios, { AxiosHeaders } from 'axios'

import { clearClientAuthHint } from '@/lib/auth/token'
import { AUTH_SESSION_PATH, DEVICE_PATH, LOGIN_PATH, REGISTER_PATH } from '@/lib/constants'
import { env } from '@/lib/env'
import { dispatchAuthExpired } from '@/lib/query/cache'
import { isBrowser } from '@/lib/runtime'

function normalizeUrlPath(url: string): string {
  return url.startsWith('/') ? url.slice(1) : url
}

function includesProjectPath(url: string | undefined): boolean {
  if (!url) {
    return false
  }

  const normalizedUrl = normalizeUrlPath(url)
  return normalizedUrl.includes('v1/projects')
}

function isAuthSessionRequest(url: string | undefined): boolean {
  if (!url) {
    return false
  }

  const normalizedUrl = normalizeUrlPath(url)
  const normalizedSessionPath = normalizeUrlPath(AUTH_SESSION_PATH)

  return normalizedUrl.includes(normalizedSessionPath)
}

function shouldSkipUnauthorizedRedirect(url: string | undefined): boolean {
  if (!url) {
    return false
  }
  const normalizedUrl = normalizeUrlPath(url)
  return isAuthSessionRequest(url) || normalizedUrl.startsWith('v1/public/secret-shares/')
}

function isProjectCreateRequest(url: string | undefined): boolean {
  if (!url) {
    return false
  }

  const normalizedUrl = normalizeUrlPath(url)
  return normalizedUrl === 'v1/projects' || normalizedUrl.startsWith('v1/projects?')
}

function isAuthOrganizationsRequest(url: string | undefined): boolean {
  if (!url) {
    return false
  }

  const normalizedUrl = normalizeUrlPath(url)
  return (
    normalizedUrl === 'v1/auth/organizations' ||
    normalizedUrl.startsWith('v1/auth/organizations?') ||
    normalizedUrl === 'v1/auth/organizations/active'
  )
}

function isAuthCapabilitiesRequest(url: string | undefined): boolean {
  if (!url) {
    return false
  }

  const normalizedUrl = normalizeUrlPath(url)
  return normalizedUrl === 'v1/auth/capabilities'
}

function isProjectAuditRequest(url: string | undefined): boolean {
  if (!url) {
    return false
  }

  const normalizedUrl = normalizeUrlPath(url)
  return /^v1\/projects\/[^/]+\/audit(?:\?|$)/.test(normalizedUrl)
}

function isOrganizationActivityRequest(url: string | undefined): boolean {
  if (!url) {
    return false
  }

  const normalizedUrl = normalizeUrlPath(url)
  return /^v1\/organizations\/[^/]+\/activity(?:\?|$)/.test(normalizedUrl)
}

function isProjectConfigRequest(url: string | undefined): boolean {
  if (!url) {
    return false
  }

  const normalizedUrl = normalizeUrlPath(url)
  return /^v1\/projects\/[^/]+\/configs(?:\/[^/?]+)?(?:\?|$)/.test(normalizedUrl)
}

function isProjectMemberEnvironmentAccessRequest(url: string | undefined): boolean {
  if (!url) {
    return false
  }

  const normalizedUrl = normalizeUrlPath(url)
  return /^v1\/projects\/[^/]+\/members\/[^/]+\/environments(?:\?|$)/.test(normalizedUrl)
}

function isUpstreamUnavailableResponse(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false
  }

  const errorCode = (error.response?.data as { code?: string } | undefined)?.code
  return error.response?.status === 503 && errorCode === 'API_UPSTREAM_UNAVAILABLE'
}

function getErrorMeta(error: unknown): Record<string, unknown> {
  if (!axios.isAxiosError(error)) {
    return {
      kind: 'unknown',
      message: error instanceof Error ? error.message : String(error),
    }
  }

  const method = error.config?.method?.toUpperCase() ?? 'UNKNOWN'
  const url = error.config?.url ?? 'UNKNOWN_URL'
  const status = error.response?.status ?? 'NO_RESPONSE'
  const responseData = error.response?.data
  const responseCode =
    typeof responseData === 'object' && responseData !== null && 'code' in responseData
      ? ((responseData as { code?: string }).code ?? 'UNKNOWN_CODE')
      : 'UNKNOWN_CODE'
  return {
    kind: 'axios',
    message: error.message || 'Request failed',
    method,
    url,
    status,
    code: error.code ?? 'UNKNOWN_AXIOS_CODE',
    responseCode,
  }
}

function formatErrorMeta(meta: Record<string, unknown>): string {
  if (meta.kind !== 'axios') {
    return String(meta.message ?? 'Unknown error')
  }

  const method = String(meta.method ?? 'UNKNOWN')
  const url = String(meta.url ?? 'UNKNOWN_URL')
  const status = String(meta.status ?? 'NO_RESPONSE')
  const responseCode = String(meta.responseCode ?? 'UNKNOWN_CODE')
  return `${method} ${url} failed with ${status} ${responseCode}`
}

function shouldSuppressDevErrorLog(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !isBrowser) {
    return false
  }

  const isSessionProbe = isAuthSessionRequest(error.config?.url)
  const isUnauthorized = error.response?.status === 401
  const isNetworkSessionProbe = isSessionProbe && !error.response
  const isUnavailableSessionProbe = isSessionProbe && isUpstreamUnavailableResponse(error)

  if ((isSessionProbe && isUnauthorized) || isNetworkSessionProbe || isUnavailableSessionProbe) {
    return true
  }

  const isRedirectableUnauthorized =
    isUnauthorized && !shouldSkipUnauthorizedRedirect(error.config?.url) && isBrowser

  if (isRedirectableUnauthorized) {
    return true
  }

  const isProjectDeleteNotFound =
    error.config?.method?.toLowerCase() === 'delete' &&
    includesProjectPath(error.config?.url) &&
    error.response?.status === 404

  const errorCode = (error.response?.data as { code?: string } | undefined)?.code
  const isExpectedEmailNotVerified =
    error.response?.status === 403 && errorCode === 'AUTH_EMAIL_NOT_VERIFIED'

  const isProjectCreateSlugConflict =
    error.config?.method?.toLowerCase() === 'post' &&
    isProjectCreateRequest(error.config?.url) &&
    error.response?.status === 409 &&
    errorCode === 'PROJECT_SLUG_CONFLICT'

  const isProjectCreateValidationError =
    error.config?.method?.toLowerCase() === 'post' &&
    isProjectCreateRequest(error.config?.url) &&
    error.response?.status === 400

  const isProjectCreateKnownFailure =
    error.config?.method?.toLowerCase() === 'post' &&
    isProjectCreateRequest(error.config?.url) &&
    error.response?.status === 500 &&
    errorCode === 'PROJECT_CREATE_FAILURE'

  const isAuthOrganizationsUnauthorized =
    isAuthOrganizationsRequest(error.config?.url) && error.response?.status === 401
  const isAuthOrganizationsUnavailable =
    isAuthOrganizationsRequest(error.config?.url) && isUpstreamUnavailableResponse(error)
  const isAuthCapabilitiesUnavailable =
    isAuthCapabilitiesRequest(error.config?.url) && isUpstreamUnavailableResponse(error)

  const authOrganizationsErrorCode = (error.response?.data as { code?: string } | undefined)?.code
  const isAuthSetActiveKnownFailure =
    error.config?.method?.toLowerCase() === 'post' &&
    normalizeUrlPath(error.config?.url ?? '') === 'v1/auth/organizations/active' &&
    error.response?.status === 500 &&
    authOrganizationsErrorCode === 'AUTH_FAILURE'

  const isOrgDeleteGuardedFailure =
    error.config?.method?.toLowerCase() === 'delete' &&
    normalizeUrlPath(error.config?.url ?? '').startsWith('v1/organizations/') &&
    error.response?.status === 400 &&
    authOrganizationsErrorCode === 'ORG_DELETE_DEFAULT_NOT_ALLOWED'

  const isProjectAuditReadRateLimited =
    error.config?.method?.toLowerCase() === 'get' &&
    isProjectAuditRequest(error.config?.url) &&
    error.response?.status === 429 &&
    errorCode === 'RATE_LIMITED'
  const isOrganizationActivityRouteMissing =
    error.config?.method?.toLowerCase() === 'get' &&
    isOrganizationActivityRequest(error.config?.url) &&
    error.response?.status === 404 &&
    errorCode === 'ROUTE_NOT_FOUND'
  const isProjectConfigRouteMissing =
    error.config?.method?.toLowerCase() === 'get' &&
    isProjectConfigRequest(error.config?.url) &&
    error.response?.status === 404 &&
    errorCode === 'ROUTE_NOT_FOUND'
  const isProjectMemberEnvironmentAccessRouteMissing =
    error.config?.method?.toLowerCase() === 'get' &&
    isProjectMemberEnvironmentAccessRequest(error.config?.url) &&
    error.response?.status === 404 &&
    errorCode === 'ROUTE_NOT_FOUND'
  const isBillingPortalSetupFailure =
    error.config?.method?.toLowerCase() === 'get' &&
    normalizeUrlPath(error.config?.url ?? '') === 'v1/billing/portal' &&
    error.response?.status === 409 &&
    errorCode === 'BILLING_STATE_INVALID'

  return (
    isProjectDeleteNotFound ||
    isProjectCreateSlugConflict ||
    isProjectCreateValidationError ||
    isProjectCreateKnownFailure ||
    isAuthOrganizationsUnauthorized ||
    isAuthOrganizationsUnavailable ||
    isAuthCapabilitiesUnavailable ||
    isAuthSetActiveKnownFailure ||
    isOrgDeleteGuardedFailure ||
    isProjectAuditReadRateLimited ||
    isOrganizationActivityRouteMissing ||
    isProjectConfigRouteMissing ||
    isProjectMemberEnvironmentAccessRouteMissing ||
    isBillingPortalSetupFailure ||
    isExpectedEmailNotVerified
  )
}

export const apiClient = axios.create({
  baseURL: isBrowser ? '/api' : env.apiUrl,
  withCredentials: true,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client': 'pentavault-web',
  },
})

apiClient.interceptors.request.use((config) => {
  config.headers = AxiosHeaders.from(config.headers)
  config.headers.set('X-Request-ID', crypto.randomUUID())

  if (config.url?.startsWith('/') && !config.url.startsWith('//')) {
    config.url = config.url.slice(1)
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      console.error('[Unexpected Error]', error)
      return Promise.reject(error)
    }

    if (!error.response) {
      if (!shouldSuppressDevErrorLog(error)) {
        console.error('[Network Error]', {
          code: error.code,
          message: error.message,
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
        })
      }

      return Promise.reject(error)
    }

    if (error.response.status === 401 && isBrowser) {
      if (!shouldSkipUnauthorizedRedirect(error.config?.url)) {
        clearClientAuthHint()
        dispatchAuthExpired()
        const redirectUrl =
          window.location.pathname !== LOGIN_PATH
            ? `${LOGIN_PATH}?expired=1&next=${encodeURIComponent(window.location.pathname)}`
            : LOGIN_PATH

        if (![LOGIN_PATH, REGISTER_PATH, DEVICE_PATH].includes(window.location.pathname)) {
          window.location.href = redirectUrl
        }
      }
    }

    if (env.isDev && !shouldSuppressDevErrorLog(error)) {
      const meta = getErrorMeta(error)
      console.error(`[API Error] ${formatErrorMeta(meta)}`, meta)
    }

    return Promise.reject(error)
  }
)
