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

  if (isSecureRequest) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
