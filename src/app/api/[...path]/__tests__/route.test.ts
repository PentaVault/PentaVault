import type { NextRequest } from 'next/server'

function createRequest(input: { url?: string; headers?: Record<string, string> }): NextRequest {
  const url = input.url ?? 'https://app.example.com/api/v1/projects?cursor=next'
  return {
    headers: new Headers(input.headers),
    method: 'GET',
    nextUrl: new URL(url),
  } as NextRequest
}

describe('Next API proxy route helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com/root/api')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('builds upstream API paths without allowing dot segments', async () => {
    const { buildTargetUrl, isSafeProxyPath } = await import('../route')
    const request = createRequest({})

    expect(buildTargetUrl(['v1', 'projects'], request)?.toString()).toBe(
      'https://api.example.com/root/api/v1/projects?cursor=next'
    )
    expect(isSafeProxyPath(['v1', '..', 'admin'])).toBe(false)
    expect(buildTargetUrl(['v1', '..', 'admin'], request)).toBeNull()
  })

  it('strips spoofable forwarding headers while keeping auth cookies', async () => {
    const { forwardRequestHeaders } = await import('../route')
    const forwarded = forwardRequestHeaders(
      createRequest({
        headers: {
          authorization: 'Bearer session-bound',
          cookie: 'better-auth.session_token=value',
          forwarded: 'for=127.0.0.1',
          'x-forwarded-for': '127.0.0.1',
          'x-real-ip': '127.0.0.1',
        },
      })
    )

    expect(forwarded.get('authorization')).toBe('Bearer session-bound')
    expect(forwarded.get('cookie')).toBe('better-auth.session_token=value')
    expect(forwarded.get('forwarded')).toBeNull()
    expect(forwarded.get('x-forwarded-for')).toBeNull()
    expect(forwarded.get('x-real-ip')).toBeNull()
  })

  it('preserves independent Set-Cookie response headers', async () => {
    const { forwardResponseHeaders } = await import('../route')
    const upstream = new Headers()
    upstream.append('set-cookie', 'session=one; Path=/; HttpOnly')
    upstream.append('set-cookie', 'csrf=two; Path=/; SameSite=Lax')

    const forwarded = forwardResponseHeaders(upstream) as Headers & {
      getSetCookie?: () => string[]
    }
    expect(forwarded.getSetCookie?.() ?? [forwarded.get('set-cookie')]).toEqual([
      'session=one; Path=/; HttpOnly',
      'csrf=two; Path=/; SameSite=Lax',
    ])
  })

  it('stops reading bodies after the proxy byte limit', async () => {
    const { readBodyWithLimit } = await import('../route')
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(8))
        controller.enqueue(new Uint8Array(8))
        controller.close()
      },
    })

    await expect(readBodyWithLimit(stream, 10)).resolves.toBeNull()
  })

  it('returns a 503 when the upstream body terminates before it can be read', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.error(new TypeError('terminated'))
          },
        })
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await import('../route')
    const response = await GET(createRequest({}), {
      params: Promise.resolve({ path: ['v1', 'projects'] }),
    })

    await expect(response.json()).resolves.toEqual({
      code: 'API_UPSTREAM_UNAVAILABLE',
      error: 'The API service is temporarily unavailable. Please try again in a moment.',
    })
    expect(response.status).toBe(503)
  })

  it('keeps event-stream responses live for notification realtime updates', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: connected\ndata: {}\n\n'))
      },
    })
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, {
        headers: {
          'content-type': 'text/event-stream',
        },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await import('../route')
    const response = await GET(createRequest({}), {
      params: Promise.resolve({ path: ['v1', 'notifications', 'stream'] }),
    })

    expect(response.headers.get('content-type')).toBe('text/event-stream')
    const reader = response.body?.getReader()
    const chunk = await reader?.read()
    await reader?.cancel()
    expect(new TextDecoder().decode(chunk?.value)).toBe('event: connected\ndata: {}\n\n')
  })

  it('rejects oversized non-streaming upstream responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('too large', {
          headers: {
            'content-length': String(1024 * 1024 + 1),
          },
        })
      )
    )

    const { GET } = await import('../route')
    const response = await GET(createRequest({}), {
      params: Promise.resolve({ path: ['v1', 'projects'] }),
    })

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toMatchObject({
      code: 'API_UPSTREAM_RESPONSE_TOO_LARGE',
    })
  })
})
