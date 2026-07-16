import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const AUTH_PROTECTED_PATH_PREFIXES = [
  '/activity',
  '/change-requests',
  '/dashboard',
  '/projects',
  '/settings',
] as const

/**
 * Resolve a legacy dashboard URL to its canonical equivalent, or `null` when
 * the path is already canonical.
 *
 * Two legacy route trees used to shadow the canonical flat tree:
 *   - `/dashboard/org/{orgId}/…`  (org-scoped; its settings subtree was
 *     incomplete, so deep links 404'd)
 *   - `/dashboard/projects/…`     (dead duplicate of `/projects/…`)
 *
 * Both are collapsed here so any bookmarked or in-flight legacy URL lands on
 * the real page instead of a missing route.
 */
function resolveLegacyDashboardPath(pathname: string): string | null {
  // /dashboard/projects/… -> /projects/…
  if (pathname === '/dashboard/projects' || pathname.startsWith('/dashboard/projects/')) {
    return pathname.slice('/dashboard'.length)
  }

  // /dashboard/org/{orgId}/… -> canonical flat route
  const orgMatch = pathname.match(/^\/dashboard\/org\/[^/]+(\/.*)?$/)
  if (!orgMatch) {
    return null
  }

  const rest = orgMatch[1] ?? ''

  if (rest === '' || rest === '/') {
    return '/dashboard'
  }
  // Projects, activity, change-requests, and onboarding share the same slug in
  // the canonical tree, so the remainder maps across directly.
  if (
    rest.startsWith('/projects') ||
    rest.startsWith('/activity') ||
    rest.startsWith('/change-requests') ||
    rest.startsWith('/onboarding')
  ) {
    return rest
  }
  // Settings split into account- vs organisation-scoped sections in the
  // canonical tree.
  if (rest === '/settings' || rest === '/settings/') {
    return '/settings/organization'
  }
  if (rest.startsWith('/settings/api-keys') || rest.startsWith('/settings/tokens')) {
    return '/settings/account/tokens'
  }
  if (rest.startsWith('/settings/sessions')) {
    return '/settings/account/sessions'
  }
  if (rest === '/settings/billing' || rest === '/settings/billing/') {
    return '/settings/organization/billing'
  }
  if (rest.startsWith('/settings/billing/plans')) {
    return '/settings/organization/billing/plans'
  }
  if (rest.startsWith('/settings/billing/upgrade')) {
    return '/settings/organization/billing/plans'
  }
  if (rest.startsWith('/settings/members')) {
    return '/settings/organization/members'
  }
  if (rest.startsWith('/settings/access')) {
    return '/settings/organization/access'
  }
  if (rest.startsWith('/settings')) {
    return '/settings/organization'
  }

  return '/dashboard'
}

function getApiOrigin(): string | null {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  if (!apiUrl) {
    return null
  }

  try {
    return new URL(apiUrl).origin
  } catch {
    return null
  }
}

export function proxy(request: NextRequest) {
  const legacyTarget = resolveLegacyDashboardPath(request.nextUrl.pathname)
  if (legacyTarget) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = legacyTarget
    return NextResponse.redirect(redirectUrl)
  }

  const apiOrigin = getApiOrigin()
  const isSecureRequest = request.nextUrl.protocol === 'https:'
  const nonce = crypto.randomUUID().replaceAll('-', '')
  const scriptSources = ["'self'", `'nonce-${nonce}'`]

  if (process.env.NODE_ENV !== 'production') {
    scriptSources.push("'unsafe-inline'")
    scriptSources.push("'unsafe-eval'")
  }

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    apiOrigin ? `connect-src 'self' ${apiOrigin}` : "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isSecureRequest ? ['upgrade-insecure-requests'] : []),
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  if (AUTH_PROTECTED_PATH_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    requestHeaders.set(
      'x-pentavault-current-path',
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    )
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (request.nextUrl.pathname === '/share' || request.nextUrl.pathname.startsWith('/share/')) {
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('Referrer-Policy', 'no-referrer')
  }

  if (isSecureRequest) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  return response
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp)$).*)'],
}
