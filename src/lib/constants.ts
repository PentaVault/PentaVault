export const APP_NAME = 'PentaVault'
export const APP_DESCRIPTION = 'Runtime secrets proxy for AI-assisted development.'

export const API_V1_PREFIX = '/v1'

export const AUTH_SESSION_PATH = `${API_V1_PREFIX}/auth/session`
export const AUTH_SESSIONS_PATH = `${API_V1_PREFIX}/auth/sessions`
export const AUTH_REVOKE_SESSION_PATH = `${API_V1_PREFIX}/auth/sessions/revoke`

export const DASHBOARD_HOME_PATH = '/dashboard'
export const ACTIVITY_PATH = '/activity'
export const PROJECTS_PATH = '/projects'
export const SETTINGS_PATH = '/settings'
export const SETTINGS_ORGANIZATION_PATH = '/settings/organization'
export const SETTINGS_ORGANIZATION_MEMBERS_PATH = '/settings/organization/members'
export const SETTINGS_ORGANIZATION_ACCESS_PATH = '/settings/organization/access'
export const SETTINGS_ORGANIZATION_BILLING_PATH = '/settings/organization/billing'
export const SETTINGS_ACCOUNT_PATH = '/settings/account'
export const SETTINGS_ACCOUNT_SECURITY_PATH = '/settings/account/security'
export const SETTINGS_ACCOUNT_SESSIONS_PATH = '/settings/account/sessions'
export const SETTINGS_ACCOUNT_TOKENS_PATH = '/settings/account/tokens'
export const SETTINGS_ACCOUNT_API_KEYS_PATH = SETTINGS_ACCOUNT_TOKENS_PATH
export const SETTINGS_API_KEYS_PATH = SETTINGS_ACCOUNT_API_KEYS_PATH
export const SETTINGS_BILLING_PATH = SETTINGS_ORGANIZATION_BILLING_PATH
export const SETTINGS_SESSIONS_PATH = SETTINGS_ACCOUNT_SESSIONS_PATH
export const LOGIN_PATH = '/login'
export const REGISTER_PATH = '/register'
export const FORGOT_PASSWORD_PATH = '/forgot-password'
export const DEVICE_PATH = '/device'
export const AUTH_PROTECTED_PATH_PREFIXES = [
  DASHBOARD_HOME_PATH,
  ACTIVITY_PATH,
  PROJECTS_PATH,
  SETTINGS_PATH,
] as const

export function getOrgDashboardPath(orgId: string): string {
  return `${DASHBOARD_HOME_PATH}/org/${orgId}`
}

export function getOrgProjectsPath(orgId: string): string {
  void orgId
  return PROJECTS_PATH
}

export function getOrgActivityPath(orgId: string): string {
  void orgId
  return ACTIVITY_PATH
}

export function getOrgProjectPath(orgId: string, projectId: string): string {
  void orgId
  return getProjectPath(projectId)
}

export function getOrgProjectSecretsPath(orgId: string, projectId: string): string {
  void orgId
  return getProjectSecretsPath(projectId)
}

export function getOrgProjectTokensPath(orgId: string, projectId: string): string {
  void orgId
  return getProjectTokensPath(projectId)
}

export function getOrgProjectTeamPath(orgId: string, projectId: string): string {
  void orgId
  return getProjectTeamPath(projectId)
}

export function getOrgProjectAuditPath(orgId: string, projectId: string): string {
  void orgId
  return getProjectAuditPath(projectId)
}

export function getOrgProjectUsagePath(orgId: string, projectId: string): string {
  void orgId
  return getProjectUsagePath(projectId)
}

export function getOrgProjectAnalyticsPath(orgId: string, projectId: string): string {
  void orgId
  return getProjectAnalyticsPath(projectId)
}

export function getOrgProjectObservabilityPath(orgId: string, projectId: string): string {
  void orgId
  return getProjectObservabilityPath(projectId)
}

export function getOrgProjectSecurityPath(orgId: string, projectId: string): string {
  void orgId
  return getProjectSecurityPath(projectId)
}

export function getOrgProjectSettingsPath(orgId: string, projectId: string): string {
  void orgId
  return getProjectSettingsPath(projectId)
}

export function getOrgSettingsPath(orgId: string): string {
  void orgId
  return SETTINGS_ORGANIZATION_PATH
}

export function getOrgSettingsApiKeysPath(orgId: string): string {
  void orgId
  return SETTINGS_ACCOUNT_API_KEYS_PATH
}

export function getOrgSettingsBillingPath(orgId: string): string {
  void orgId
  return SETTINGS_ORGANIZATION_BILLING_PATH
}

export function getOrgSettingsSessionsPath(orgId: string): string {
  void orgId
  return SETTINGS_ACCOUNT_SESSIONS_PATH
}

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
  return getProjectAnalyticsPath(projectId)
}

export function getProjectAnalyticsPath(projectId: string): string {
  return `${getProjectPath(projectId)}/analytics`
}

export function getProjectObservabilityPath(projectId: string): string {
  return getProjectAnalyticsPath(projectId)
}

export function getProjectSecurityPath(projectId: string): string {
  return `${getProjectPath(projectId)}/security`
}

export function getProjectSettingsPath(projectId: string): string {
  return `${getProjectPath(projectId)}/settings`
}

export const DEFAULT_QUERY_STALE_TIME_MS = 30_000

export const PROJECT_ROLES = ['owner', 'admin', 'member'] as const
export const PROJECT_STATUSES = ['active', 'archived'] as const

export const SECRET_MODES = ['compatibility', 'gateway'] as const
export const SECRET_STATUSES = ['active', 'archived', 'revoked'] as const

export const AUDIT_OUTCOMES = ['success', 'failure'] as const
