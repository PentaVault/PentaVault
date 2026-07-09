'use client'

import { passkeyClient } from '@better-auth/passkey/client'
import { createAuthClient } from 'better-auth/client'
import { env } from '@/lib/env'

const authBaseUrl = new URL('/api/auth', env.appUrl).toString()

export const betterAuthClient = createAuthClient({
  baseURL: authBaseUrl,
  plugins: [passkeyClient()],
})
