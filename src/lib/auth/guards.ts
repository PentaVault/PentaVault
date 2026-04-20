import { redirect } from 'next/navigation'

import { buildLoginRedirectPath } from '@/lib/auth/paths'
import { DASHBOARD_HOME_PATH } from '@/lib/constants'

export function redirectToLogin(nextPath?: string): never {
  redirect(buildLoginRedirectPath(nextPath))
}

export function redirectToDashboard(): never {
  redirect(DASHBOARD_HOME_PATH)
}
