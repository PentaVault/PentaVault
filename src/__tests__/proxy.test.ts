import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

import { config, proxy } from '@/proxy'

describe('proxy', () => {
  it('stores the current protected path for server auth redirects', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com/api')
    const request = new NextRequest('https://app.example.com/projects/project_1?tab=secrets')
    const response = proxy(request)

    expect(response.headers.get('x-middleware-request-x-pentavault-current-path')).toBe(
      '/projects/project_1?tab=secrets'
    )
  })

  it('does not add auth redirect state for API requests', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com/api')
    const request = new NextRequest('https://app.example.com/api/v1/auth/session')
    const response = proxy(request)

    expect(response.headers.get('x-middleware-request-x-pentavault-current-path')).toBeNull()
  })

  it('does not run the proxy on API route handlers', () => {
    expect(config.matcher).toEqual([
      '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ])
  })
})
