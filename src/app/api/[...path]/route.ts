import type { NextRequest } from 'next/server'

import { env } from '@/lib/env'

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  'forwarded',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-forwarded-server',
  'x-real-ip',
  'x-client-ip',
  'x-cluster-client-ip',
  'x-original-forwarded-for',
  'cf-connecting-ip',
  'true-client-ip',
  'fastly-client-ip',
  'x-vercel-forwarded-for',
  'x-vercel-ip-city',
  'x-vercel-ip-country',
  'x-vercel-ip-country-region',
])

export function isSafeProxyPath(path: string[]): boolean {
  return path.every((segment) => {
    const normalizedSegment = segment.trim()
    return normalizedSegment !== '' && normalizedSegment !== '.' && normalizedSegment !== '..'
  })
}

export function buildTargetUrl(path: string[], request: NextRequest): URL | null {
  if (!isSafeProxyPath(path)) {
    return null
  }

  const parsedBase = new URL(env.apiUrl)
  const trimmedPathname = parsedBase.pathname.replace(/\/+$/, '')
  const apiPathname = trimmedPathname.endsWith('/api') ? trimmedPathname : `${trimmedPathname}/api`
  const encodedPath = path.map((segment) => encodeURIComponent(segment)).join('/')
  parsedBase.pathname = `${apiPathname}/${encodedPath}`
  parsedBase.search = ''
  parsedBase.hash = ''

  parsedBase.search = request.nextUrl.search
  return parsedBase
}

export function forwardRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers()

  request.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase()

    if (HOP_BY_HOP_HEADERS.has(normalizedKey)) {
      return
    }

    headers.set(key, value)
  })

  return headers
}

export function forwardResponseHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers()

  upstreamHeaders.forEach((value, key) => {
    const normalizedKey = key.toLowerCase()

    if (HOP_BY_HOP_HEADERS.has(normalizedKey)) {
      return
    }

    headers.append(key, value)
  })

  return headers
}

async function handle(request: NextRequest, path: string[]): Promise<Response> {
  const targetUrl = buildTargetUrl(path, request)

  if (!targetUrl) {
    return Response.json(
      {
        code: 'INVALID_PROXY_PATH',
        error: 'API proxy path is invalid.',
      },
      { status: 400 }
    )
  }

  const method = request.method.toUpperCase()
  const headers = forwardRequestHeaders(request)
  const requestInit: RequestInit = {
    method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
  }

  if (method !== 'GET' && method !== 'HEAD') {
    requestInit.body = await request.arrayBuffer()
  }

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(targetUrl, requestInit)
  } catch {
    return Response.json(
      {
        code: 'API_UPSTREAM_UNAVAILABLE',
        error: 'The API service is temporarily unavailable. Please try again in a moment.',
      },
      { status: 503 }
    )
  }

  const responseHeaders = forwardResponseHeaders(upstreamResponse.headers)
  if (upstreamResponse.headers.get('content-type')?.toLowerCase().includes('text/event-stream')) {
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    })
  }

  let responseBody: ArrayBuffer | null = null
  try {
    responseBody = method === 'HEAD' ? null : await upstreamResponse.arrayBuffer()
  } catch {
    return Response.json(
      {
        code: 'API_UPSTREAM_UNAVAILABLE',
        error: 'The API service is temporarily unavailable. Please try again in a moment.',
      },
      { status: 503 }
    )
  }

  return new Response(responseBody, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  })
}

type RouteContext = {
  params: Promise<{ path: string[] }>
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params
  return handle(request, path)
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params
  return handle(request, path)
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params
  return handle(request, path)
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params
  return handle(request, path)
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params
  return handle(request, path)
}
