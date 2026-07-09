'use client'

import { useEffect, useState } from 'react'

import { authApi } from '@/lib/api/auth'
import type { AuthCapabilitiesResponse } from '@/lib/types/api'
import { getApiErrorCode, getApiErrorStatus } from '@/lib/utils/errors'

const defaultCapabilities: AuthCapabilitiesResponse = {
  captcha: {
    enabled: false,
    provider: 'cloudflare-turnstile',
    siteKey: null,
  },
  passkey: {
    enabled: false,
  },
  admin: {
    enabled: false,
  },
  jwt: {
    enabled: false,
  },
}

function isTemporaryUpstreamUnavailable(error: unknown): boolean {
  return getApiErrorStatus(error) === 503 && getApiErrorCode(error) === 'API_UPSTREAM_UNAVAILABLE'
}

export function useAuthCapabilities() {
  const [capabilities, setCapabilities] = useState<AuthCapabilitiesResponse>(defaultCapabilities)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    function loadCapabilities(attempt = 0) {
      authApi
        .getCapabilities()
        .then((response) => {
          if (!cancelled) {
            setCapabilities(response)
            setError(null)
            setIsLoading(false)
          }
        })
        .catch((capabilitiesError: unknown) => {
          if (cancelled) {
            return
          }

          if (isTemporaryUpstreamUnavailable(capabilitiesError) && attempt < 3) {
            retryTimer = setTimeout(() => loadCapabilities(attempt + 1), 500 * (attempt + 1))
            return
          }

          setCapabilities(defaultCapabilities)
          setError(
            capabilitiesError instanceof Error
              ? capabilitiesError
              : new Error('Auth capabilities unavailable')
          )
          setIsLoading(false)
        })
    }

    loadCapabilities()

    return () => {
      cancelled = true
      if (retryTimer) {
        clearTimeout(retryTimer)
      }
    }
  }, [])

  return { capabilities, error, isLoading }
}
