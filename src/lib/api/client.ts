import axios, { AxiosHeaders } from 'axios'

import { clearClientAuthHint } from '@/lib/auth/token'
import { AUTH_SESSION_PATH, DEVICE_PATH, LOGIN_PATH, REGISTER_PATH } from '@/lib/constants'
import { env } from '@/lib/env'
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
  return isAuthSessionRequest(url)
}

function isProjectCreateRequest(url: string | undefined): boolean {
  if (!url) {
    return false
  }

  const normalizedUrl = normalizeUrlPath(url)
  return normalizedUrl === 'v1/projects' || normalizedUrl.startsWith('v1/projects?')
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
  const responseError =
    typeof responseData === 'object' && responseData !== null && 'error' in responseData
      ? ((responseData as { error?: string }).error ?? 'UNKNOWN_ERROR')
      : 'UNKNOWN_ERROR'

  return {
    kind: 'axios',
    message: error.message || 'Request failed',
    method,
    url,
    status,
    code: error.code ?? 'UNKNOWN_AXIOS_CODE',
    responseCode,
    responseError,
    data: responseData ?? null,
  }
}

function shouldSuppressDevErrorLog(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !isBrowser) {
    return false
  }

  const isSessionProbe = isAuthSessionRequest(error.config?.url)
  const isUnauthorized = error.response?.status === 401
  const isNetworkSessionProbe = isSessionProbe && !error.response

  if ((isSessionProbe && isUnauthorized) || isNetworkSessionProbe) {
    return true
  }

  const isProjectDeleteNotFound =
    error.config?.method?.toLowerCase() === 'delete' &&
    includesProjectPath(error.config?.url) &&
    error.response?.status === 404

  const errorCode = (error.response?.data as { code?: string } | undefined)?.code
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

  return (
    isProjectDeleteNotFound ||
    isProjectCreateSlugConflict ||
    isProjectCreateValidationError ||
    isProjectCreateKnownFailure
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

  if (config.url && config.url.startsWith('/') && !config.url.startsWith('//')) {
    config.url = config.url.slice(1)
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && isBrowser) {
      if (!shouldSkipUnauthorizedRedirect(error.config?.url)) {
        clearClientAuthHint()

        if (![LOGIN_PATH, REGISTER_PATH, DEVICE_PATH].includes(window.location.pathname)) {
          window.location.href = LOGIN_PATH
        }
      }
    }

    if (env.isDev && !shouldSuppressDevErrorLog(error)) {
      console.error('[API Error]', getErrorMeta(error))
    }

    return Promise.reject(error)
  }
)
