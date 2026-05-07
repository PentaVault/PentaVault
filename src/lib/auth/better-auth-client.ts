'use client'

import { passkeyClient } from '@better-auth/passkey/client'
import { createAuthClient } from 'better-auth/client'

export const betterAuthClient = createAuthClient({
  baseURL: '/api/auth',
  plugins: [passkeyClient()],
})
