import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '@/lib/api/client'
import {
  registerReauthenticationHandler,
  resetReauthenticationState,
} from '@/lib/api/reauthentication'

vi.mock('@/lib/env', () => ({
  env: {
    apiUrl: 'http://localhost:3001/api',
    appUrl: 'http://localhost:3000',
    isDev: false,
    isProd: false,
    isTest: true,
    mockAuthEmail: 'demo@pentavault.local',
    mockAuthEnabled: false,
    mockAuthName: 'Demo User',
    mockAuthPassword: 'demo-password-123',
    mockAuthUserId: 'mock-user-1',
    nodeEnv: 'test',
  },
}))

/**
 * The recovery path for a session that is valid but no longer fresh.
 *
 * The backend answers 403 `AUTH_SESSION_NOT_FRESH` for eight sensitive
 * operations once a session ages past `freshAge`. The client's job is to get the
 * password confirmed and then replay the request the user actually made, rather
 * than surfacing an error for something they are still entitled to do.
 *
 * Driven by swapping the axios adapter rather than a mocking library, so the
 * real interceptor chain runs exactly as it does in the browser.
 */
describe('api client fresh-session recovery', () => {
  const originalAdapter = apiClient.defaults.adapter

  beforeEach(() => {
    resetReauthenticationState()
  })

  afterEach(() => {
    // `exactOptionalPropertyTypes` refuses an explicit undefined here, and axios
    // treats a missing adapter as "pick the default" anyway.
    if (originalAdapter === undefined) {
      delete apiClient.defaults.adapter
    } else {
      apiClient.defaults.adapter = originalAdapter
    }
    resetReauthenticationState()
  })

  function ok(config: InternalAxiosRequestConfig): AxiosResponse {
    return {
      config,
      data: { sessions: [] },
      headers: {},
      status: 200,
      statusText: 'OK',
    }
  }

  function failure(config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosError {
    return new AxiosError('Request failed', String(status), config, null, {
      config,
      data,
      headers: {},
      status,
      statusText: 'Error',
    } as AxiosResponse)
  }

  /** Replies with the queued outcomes in order, recording every attempt. */
  function stubAdapter(outcomes: Array<{ status: number; data?: unknown }>) {
    const attempts: string[] = []
    let index = 0

    apiClient.defaults.adapter = async (config) => {
      attempts.push(config.url ?? '')
      const outcome = outcomes[Math.min(index, outcomes.length - 1)]
      index += 1
      const withHeaders = { ...config, headers: new AxiosHeaders(config.headers) }

      if (!outcome || outcome.status < 400) {
        return ok(withHeaders)
      }
      throw failure(withHeaders, outcome.status, outcome.data)
    }

    return attempts
  }

  const stale = { status: 403, data: { code: 'AUTH_SESSION_NOT_FRESH', error: 'Confirm.' } }

  it('replays the original request after the password is confirmed', async () => {
    const handler = vi.fn(async () => true)
    registerReauthenticationHandler(handler)
    const attempts = stubAdapter([stale, { status: 200 }])

    const response = await apiClient.get('v1/auth/sessions')

    expect(response.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
    // The user's click is honoured, not just the page repaired.
    expect(attempts).toEqual(['v1/auth/sessions', 'v1/auth/sessions'])
  })

  it('surfaces the original error when the user cancels', async () => {
    registerReauthenticationHandler(async () => false)
    stubAdapter([stale])

    await expect(apiClient.get('v1/auth/sessions')).rejects.toMatchObject({
      response: { status: 403 },
    })
  })

  it('gives up after one retry rather than looping', async () => {
    const handler = vi.fn(async () => true)
    registerReauthenticationHandler(handler)
    // A backend that keeps refusing — a clock skew, say — must not turn into an
    // endless prompt-and-retry cycle.
    const attempts = stubAdapter([stale])

    await expect(apiClient.get('v1/auth/sessions')).rejects.toMatchObject({
      response: { status: 403 },
    })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(attempts).toHaveLength(2)
  })

  it('leaves an ordinary permission failure alone', async () => {
    const handler = vi.fn(async () => true)
    registerReauthenticationHandler(handler)
    stubAdapter([{ status: 403, data: { code: 'PROJECT_FORBIDDEN', error: 'Nope.' } }])

    await expect(apiClient.get('v1/projects/p_1')).rejects.toMatchObject({
      response: { status: 403 },
    })
    // Asking for a password would be nonsense here: no amount of re-authentication
    // grants access the account does not have.
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not prompt for a server failure', async () => {
    const handler = vi.fn(async () => true)
    registerReauthenticationHandler(handler)
    stubAdapter([{ status: 500, data: { code: 'AUTH_FAILURE', error: 'Boom.' } }])

    await expect(apiClient.get('v1/auth/sessions')).rejects.toMatchObject({
      response: { status: 500 },
    })
    expect(handler).not.toHaveBeenCalled()
  })
})
