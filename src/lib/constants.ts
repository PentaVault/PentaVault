export const APP_NAME = 'PentaVault'
export const APP_DESCRIPTION = 'Runtime secrets proxy for AI-assisted development.'

export const API_V1_PREFIX = '/v1'

export const AUTH_SESSION_PATH = `${API_V1_PREFIX}/auth/session`
export const AUTH_SESSIONS_PATH = `${API_V1_PREFIX}/auth/sessions`
export const AUTH_REVOKE_SESSION_PATH = `${API_V1_PREFIX}/auth/sessions/revoke`

export const DASHBOARD_HOME_PATH = '/dashboard'
export const PROJECTS_PATH = '/projects'
export const SETTINGS_PATH = '/settings'
export const SETTINGS_API_KEYS_PATH = '/settings/api-keys'
export const SETTINGS_BILLING_PATH = '/settings/billing'
export const SETTINGS_SESSIONS_PATH = '/settings/sessions'
export const ONBOARDING_PATH = '/onboarding'
export const LOGIN_PATH = '/login'
export const REGISTER_PATH = '/register'
export const DEVICE_PATH = '/device'
export const AUTH_PROTECTED_PATH_PREFIXES = [
  DASHBOARD_HOME_PATH,
  PROJECTS_PATH,
  SETTINGS_PATH,
  ONBOARDING_PATH,
] as const

export function getProjectPath(projectId: string): string {
  return `${PROJECTS_PATH}/${projectId}`
}

export function getProjectSecretsPath(projectId: string): string {
  return `${getProjectPath(projectId)}/secrets`
}

export function getProjectTokensPath(projectId: string): string {
  return `${getProjectPath(projectId)}/tokens`
}

export function getProjectTeamPath(projectId: string): string {
  return `${getProjectPath(projectId)}/team`
}

export function getProjectAuditPath(projectId: string): string {
  return `${getProjectPath(projectId)}/audit`
}

export function getProjectUsagePath(projectId: string): string {
  return `${getProjectPath(projectId)}/usage`
}

export function getProjectSecurityPath(projectId: string): string {
  return `${getProjectPath(projectId)}/security`
}

export const DEFAULT_QUERY_STALE_TIME_MS = 30_000

export const PROJECT_ROLES = ['owner', 'admin', 'member'] as const
export const PROJECT_STATUSES = ['active', 'archived'] as const

export const SECRET_MODES = ['compatibility', 'gateway'] as const
export const SECRET_STATUSES = ['active', 'archived', 'revoked'] as const

export const AUDIT_OUTCOMES = ['success', 'failure'] as const
