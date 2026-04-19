export const APP_NAME = 'PentaVault'
export const APP_DESCRIPTION = 'Runtime secrets proxy for AI-assisted development.'

export const API_V1_PREFIX = '/v1'

export const AUTH_SESSION_PATH = `${API_V1_PREFIX}/auth/session`
export const AUTH_SESSIONS_PATH = `${API_V1_PREFIX}/auth/sessions`
export const AUTH_REVOKE_SESSION_PATH = `${API_V1_PREFIX}/auth/sessions/revoke`

export const DASHBOARD_HOME_PATH = '/dashboard'
export const LOGIN_PATH = '/login'
export const REGISTER_PATH = '/register'

export const DEFAULT_QUERY_STALE_TIME_MS = 30_000

export const PROJECT_ROLES = ['owner', 'admin', 'member'] as const
export const PROJECT_STATUSES = ['active', 'archived'] as const

export const SECRET_MODES = ['compatibility', 'gateway'] as const
export const SECRET_STATUSES = ['active', 'archived', 'revoked'] as const

export const AUDIT_OUTCOMES = ['success', 'failure'] as const
