import axios, { AxiosHeaders } from 'axios'

import { clearClientAuthHint } from '@/lib/auth/token'
import { env } from '@/lib/env'

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
  const requestId = crypto.randomUUID()

  config.headers = AxiosHeaders.from(config.headers)
  config.headers.set('X-Request-ID', requestId)

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        clearClientAuthHint()

        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }

    if (env.isDev && axios.isAxiosError(error)) {
      console.error('[API Error]', error.response?.status, error.config?.url)
    }

    return Promise.reject(error)
  }
)
