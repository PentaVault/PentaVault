import { redirect } from 'next/navigation'

import { DASHBOARD_HOME_PATH, LOGIN_PATH } from '@/lib/constants'

export function buildLoginRedirectPath(nextPath?: string): string {
  if (!nextPath) {
    return LOGIN_PATH
  }

  const searchParams = new URLSearchParams({ next: nextPath })
  return `${LOGIN_PATH}?${searchParams.toString()}`
}

export function redirectToLogin(nextPath?: string): never {
  redirect(buildLoginRedirectPath(nextPath))
}

export function redirectToDashboard(): never {
  redirect(DASHBOARD_HOME_PATH)
}
