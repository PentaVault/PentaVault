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
])

function buildTargetUrl(path: string[], request: NextRequest): URL {
  const parsedBase = new URL(env.apiUrl)
  const trimmedPathname = parsedBase.pathname.replace(/\/+$/, '')
  parsedBase.pathname = `${trimmedPathname.endsWith('/api') ? trimmedPathname : `${trimmedPathname}/api`}/`
  parsedBase.search = ''
  parsedBase.hash = ''

  const base = parsedBase.toString()
  const upstream = new URL(path.join('/'), base)
  upstream.search = request.nextUrl.search
  return upstream
}

function forwardRequestHeaders(request: NextRequest): Headers {
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

function forwardResponseHeaders(upstreamHeaders: Headers): Headers {
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

  return new Response(upstreamResponse.body, {
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
