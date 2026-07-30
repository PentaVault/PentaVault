/**
 * Bridge between the axios interceptor and the password-confirmation dialog.
 *
 * Some operations need a session created recently rather than merely a valid one
 * — listing or revoking sessions, changing an email or password, deleting the
 * account — so a stolen cookie cannot be used hours later to take an account
 * over. When a session ages past that window the backend answers 403
 * `AUTH_SESSION_NOT_FRESH`.
 *
 * The interceptor cannot render a dialog and the dialog cannot see the failed
 * request, so they meet here: the provider registers a handler, the interceptor
 * asks for a fresh session and waits.
 */

type ReauthenticationHandler = () => Promise<boolean>

let handler: ReauthenticationHandler | null = null

/**
 * The prompt currently on screen, if any.
 *
 * A page typically fires several requests at once, and without this every one of
 * them would open its own dialog. Concurrent callers share one prompt and all
 * receive its result.
 */
let pending: Promise<boolean> | null = null

export function registerReauthenticationHandler(next: ReauthenticationHandler): () => void {
  handler = next
  return () => {
    if (handler === next) {
      handler = null
    }
  }
}

/**
 * Asks the user to confirm their password, resolving true once the session is
 * fresh again.
 *
 * Resolves false when no handler is mounted — on a server render, or outside the
 * dashboard — so callers fall back to surfacing the original error rather than
 * hanging on a dialog that will never appear.
 */
export function requestFreshSession(): Promise<boolean> {
  if (!handler) {
    return Promise.resolve(false)
  }

  if (pending) {
    return pending
  }

  const current = handler()
    .catch(() => false)
    .finally(() => {
      if (pending === current) {
        pending = null
      }
    })

  pending = current
  return current
}

/** Test seam: forgets any in-flight prompt between cases. */
export function resetReauthenticationState(): void {
  handler = null
  pending = null
}
