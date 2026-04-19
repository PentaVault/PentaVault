import axios, { AxiosHeaders } from 'axios'

import { clearClientAuthHint } from '@/lib/auth/token'
import { env } from '@/lib/env'
import { isBrowser } from '@/lib/runtime'

export const apiClient = axios.create({
  baseURL: env.apiUrl,
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

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && isBrowser) {
      clearClientAuthHint()

      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    if (env.isDev && axios.isAxiosError(error) && error.response) {
      console.error('[API Error]', error.response.status, error.config?.url)
    }

    return Promise.reject(error)
  }
)
