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
      '/((?!api/|_next/static|_next/image|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp)$).*)',
    ])
  })

  it.each([
    ['/dashboard/projects', '/projects'],
    ['/dashboard/projects/project_1', '/projects/project_1'],
    ['/dashboard/projects/project_1/secrets', '/projects/project_1/secrets'],
    ['/dashboard/org/org_1', '/dashboard'],
    ['/dashboard/org/org_1/projects', '/projects'],
    ['/dashboard/org/org_1/projects/project_1/secrets', '/projects/project_1/secrets'],
    ['/dashboard/org/org_1/activity', '/activity'],
    ['/dashboard/org/org_1/change-requests', '/change-requests'],
    ['/dashboard/org/org_1/settings', '/settings/organization'],
    ['/dashboard/org/org_1/settings/members', '/settings/organization/members'],
    ['/dashboard/org/org_1/settings/access', '/settings/organization/access'],
    ['/dashboard/org/org_1/settings/billing', '/settings/organization/billing'],
    ['/dashboard/org/org_1/settings/api-keys', '/settings/account/tokens'],
    ['/dashboard/org/org_1/settings/sessions', '/settings/account/sessions'],
  ])('redirects legacy route %s to %s', (from, to) => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com/api')
    const request = new NextRequest(`https://app.example.com${from}`)
    const response = proxy(request)

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe(to)
  })

  it('preserves the query string when redirecting a legacy route', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com/api')
    const request = new NextRequest(
      'https://app.example.com/dashboard/org/org_1/activity?event=abc'
    )
    const response = proxy(request)
    const location = new URL(response.headers.get('location') ?? '')

    expect(location.pathname).toBe('/activity')
    expect(location.searchParams.get('event')).toBe('abc')
  })

  it('does not redirect canonical routes', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com/api')
    for (const path of [
      '/dashboard',
      '/projects/project_1',
      '/settings/organization',
      '/activity',
    ]) {
      const response = proxy(new NextRequest(`https://app.example.com${path}`))
      expect(response.headers.get('location')).toBeNull()
    }
  })
})
