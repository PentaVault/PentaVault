import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

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
  const response = NextResponse.next()
  const apiOrigin = getApiOrigin()
  const isSecureRequest = request.nextUrl.protocol === 'https:'
  const scriptSources = ["'self'", "'unsafe-inline'"]

  if (process.env.NODE_ENV !== 'production') {
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

  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (isSecureRequest) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
