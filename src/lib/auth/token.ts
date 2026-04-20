/**
 * Authentication cookie strategy.
 *
 * PentaVault uses backend-managed httpOnly session cookies.
 * The frontend must never store auth tokens in localStorage or sessionStorage.
 * The session cookie itself is intentionally unreadable from JavaScript.
 *
 * Current backend truth:
 * - session state is derived from `/api/v1/auth/session`
 * - the backend owns the actual session cookie lifecycle
 * - a lightweight non-httpOnly hint cookie may be added later if the backend chooses
 *   to support one, but it is not required for this scaffold
 */

export const AUTH_HINT_COOKIE_NAME = 'pv_auth'

export function setClientAuthHint(): void {
  document.cookie = `${AUTH_HINT_COOKIE_NAME}=1; path=/; SameSite=Lax`
}

export function clearClientAuthHint(): void {
  document.cookie = `${AUTH_HINT_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`
}

export function hasAuthCookieHint(): boolean {
  return document.cookie.includes(`${AUTH_HINT_COOKIE_NAME}=1`)
}
