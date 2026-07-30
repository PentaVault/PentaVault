import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  registerReauthenticationHandler,
  requestFreshSession,
  resetReauthenticationState,
} from '@/lib/api/reauthentication'

describe('reauthentication bridge', () => {
  beforeEach(() => {
    resetReauthenticationState()
  })

  it('resolves false when nothing is listening', async () => {
    // On a server render, or outside the dashboard, there is no dialog to show.
    // Resolving false lets the caller surface the original error instead of
    // waiting forever on a prompt that will never appear.
    await expect(requestFreshSession()).resolves.toBe(false)
  })

  it('shows one prompt for concurrent callers', async () => {
    let release: (confirmed: boolean) => void = () => undefined
    const handler = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          release = resolve
        })
    )
    registerReauthenticationHandler(handler)

    // A page usually fires several requests at once. Without single-flighting,
    // each would stack its own password dialog.
    const first = requestFreshSession()
    const second = requestFreshSession()
    const third = requestFreshSession()

    expect(handler).toHaveBeenCalledTimes(1)

    release(true)
    await expect(Promise.all([first, second, third])).resolves.toEqual([true, true, true])
  })

  it('prompts again after the previous attempt settles', async () => {
    const handler = vi.fn(async () => true)
    registerReauthenticationHandler(handler)

    await requestFreshSession()
    await requestFreshSession()

    // The single-flight is per attempt, not permanent — a session can go stale
    // more than once in a sitting.
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('treats a thrown handler as a refusal rather than propagating', async () => {
    registerReauthenticationHandler(async () => {
      throw new Error('dialog exploded')
    })

    // The caller is an axios interceptor; an error escaping here would replace a
    // meaningful API failure with an unrelated one.
    await expect(requestFreshSession()).resolves.toBe(false)
  })

  it('stops prompting once the provider unmounts', async () => {
    const handler = vi.fn(async () => true)
    const unregister = registerReauthenticationHandler(handler)

    unregister()

    await expect(requestFreshSession()).resolves.toBe(false)
    expect(handler).not.toHaveBeenCalled()
  })

  it('leaves a newer handler in place when an older one unregisters', async () => {
    const stale = vi.fn(async () => false)
    const current = vi.fn(async () => true)

    const unregisterStale = registerReauthenticationHandler(stale)
    registerReauthenticationHandler(current)
    // React can mount the replacement before tearing down the old one, and that
    // cleanup must not remove the handler that replaced it.
    unregisterStale()

    await expect(requestFreshSession()).resolves.toBe(true)
    expect(current).toHaveBeenCalledTimes(1)
  })
})
