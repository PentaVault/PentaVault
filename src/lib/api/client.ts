import axios, { AxiosHeaders } from 'axios'

import { clearClientAuthHint } from '@/lib/auth/token'
import { AUTH_SESSION_PATH, DEVICE_PATH, LOGIN_PATH, REGISTER_PATH } from '@/lib/constants'
import { env } from '@/lib/env'
import { isBrowser } from '@/lib/runtime'

function shouldSkipUnauthorizedRedirect(url: string | undefined): boolean {
  if (!url) {
    return false
  }

  return url.includes(AUTH_SESSION_PATH)
}

function getErrorMeta(error: unknown): Record<string, unknown> {
  if (!axios.isAxiosError(error)) {
    return {
      kind: 'unknown',
    }
  }

  return {
    kind: 'axios',
    method: error.config?.method,
    url: error.config?.url,
    status: error.response?.status,
    code: error.code,
    data: error.response?.data,
  }
}

function shouldSuppressDevErrorLog(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !isBrowser) {
    return false
  }

  const isSessionProbe = error.config?.url?.includes(AUTH_SESSION_PATH)
  const isUnauthorized = error.response?.status === 401
  const isAuthScreen = [LOGIN_PATH, REGISTER_PATH, DEVICE_PATH].includes(window.location.pathname)

  if (isSessionProbe && isUnauthorized && isAuthScreen) {
    return true
  }

  const isProjectDeleteNotFound =
    error.config?.method?.toLowerCase() === 'delete' &&
    Boolean(error.config?.url?.includes('/v1/projects/')) &&
    error.response?.status === 404

  return isProjectDeleteNotFound
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
