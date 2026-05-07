'use client'

import { useEffect, useState } from 'react'

import { authApi } from '@/lib/api/auth'
import type { AuthCapabilitiesResponse } from '@/lib/types/api'

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

export function useAuthCapabilities() {
  const [capabilities, setCapabilities] = useState<AuthCapabilitiesResponse>(defaultCapabilities)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    authApi
      .getCapabilities()
      .then((response) => {
        if (!cancelled) {
          setCapabilities(response)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCapabilities(defaultCapabilities)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { capabilities, isLoading }
}
