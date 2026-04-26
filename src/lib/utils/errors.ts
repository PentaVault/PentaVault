import axios from 'axios'

import type { ApiErrorResponse } from '@/lib/types/api'

type ApiErrorPayload = {
  code?: string
  error?: string
  message?: string
  requestId?: string
  suggestedSlug?: string
  retryAfter?: number
  fields?: Record<string, string>
}

const API_ERROR_MESSAGES_BY_CODE: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: 'Incorrect email or password. Please try again.',
  AUTH_EMAIL_ALREADY_EXISTS: 'An account with this email already exists. Try signing in.',
  AUTH_PASSWORD_TOO_WEAK:
    'Use at least 8 characters with uppercase, lowercase, number, and special characters.',
  AUTH_EMAIL_INVALID: 'Please enter a valid email address.',
  AUTH_NAME_TOO_SHORT: 'Your name must be at least 2 characters.',
  AUTH_EMAIL_NOT_VERIFIED: 'Verify your email before signing in.',
  AUTH_VERIFICATION_CODE_INVALID: 'The verification code is invalid. Check the code and try again.',
  AUTH_VERIFICATION_CODE_EXPIRED: 'This verification code has expired. Request a new code.',
  AUTH_VERIFICATION_CODE_LOCKED:
    'Too many incorrect verification attempts. Request a new code and try again.',
  AUTH_VERIFICATION_TOO_MANY_ATTEMPTS:
    'Too many incorrect verification attempts. Request a new code and try again.',
  AUTH_MFA_CODE_INVALID: 'The authentication code is invalid. Check the code and try again.',
  AUTH_MFA_NOT_ENABLED: 'Multi-factor authentication is not enabled for this account.',
  AUTH_MFA_TOO_MANY_ATTEMPTS: 'Too many MFA attempts. Start the sign-in flow again.',
  AUTH_MFA_DISABLE_FLOW_REQUIRED: 'Use the account security flow to disable MFA.',
  AUTH_MFA_DISABLE_CODE_NOT_FOUND: 'That disable request expired. Start again to get a new code.',
  AUTH_MFA_DISABLE_CODE_EXPIRED: 'That disable code expired. Request a new one.',
  AUTH_MFA_DISABLE_CODE_INVALID: 'The email code is invalid. Check it and try again.',
  AUTH_MFA_DISABLE_CODE_LOCKED:
    'Too many incorrect disable-code attempts. Request a new code and try again.',
  AUTH_MFA_DISABLE_FAILURE: 'Unable to update MFA right now. Please try again.',
  AUTH_PASSWORD_INVALID: 'The password you entered is incorrect.',
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  AUTH_FAILURE: 'Authentication service is temporarily unavailable. Please try again.',
  SESSION_NOT_FOUND: 'Session not found. It may have already expired or been revoked.',
  SESSION_REVOKE_FAILURE: 'Unable to revoke this session. Please try again.',
  SESSION_CANNOT_REVOKE_CURRENT: 'Use Sign Out to end your current session.',
  API_KEY_NOT_ALLOWED: 'API keys cannot be used for this action. Use a browser session.',
  DEVICE_CODE_NOT_FOUND: 'Device code not found or expired. Run vaultproxy login again.',
  DEVICE_CODE_ALREADY_USED: 'This device has already been approved.',
  DEVICE_REQUEST_NOT_FOUND: 'Device request not found or expired. Start the CLI sign-in again.',
  DEVICE_APPROVAL_FAILED: 'Device approval failed. Verify the code and try again.',
  PROJ_NAME_REQUIRED: 'Project name is required.',
  PROJ_NAME_TOO_LONG: 'Project name is too long. Maximum 120 characters.',
  PROJ_SLUG_INVALID: 'Slug can only contain lowercase letters, numbers, and hyphens.',
  PROJECT_SLUG_CONFLICT: 'That project slug is already taken.',
  PROJECT_NOT_FOUND: 'Project not found. It may have been deleted or you may not have access.',
  PROJECT_FORBIDDEN: 'Only the project owner can perform this action.',
  PROJECT_ACCESS_REQUIRED:
    "You don't have access to this project. Request access from a project admin.",
  PROJECT_CANNOT_REMOVE_LAST_OWNER: 'Cannot remove the only project owner.',
  PROJECT_OWNER_SELF_REMOVE: 'Transfer ownership before removing yourself.',
  ORG_OWNER_CANNOT_BE_REMOVED_FROM_PROJECT:
    "This member's project access comes from their organisation owner role. Change their organisation role to remove project access.",
  PROJECT_CREATE_FAILURE: 'Project creation failed unexpectedly. Please try again.',
  PROJECT_READ_FAILURE: 'Unable to load project details. Please refresh.',
  PROJECT_UPDATE_FAILURE: 'Unable to update project. Please try again.',
  PROJECT_DELETE_FAILURE: 'Unable to delete project. Please try again.',
  PROJECT_LIST_FAILURE: 'Unable to load projects. Please refresh the page.',
  PROJECT_AUDIT_READ_FAILURE: 'Unable to load audit log. Please try again.',
  PROJECT_ALERT_NOT_FOUND: 'Security alert not found.',
  PROJECT_ALERT_CREATE_FAILURE: 'Unable to create security alert. Please try again.',
  PROJECT_ALERT_UPDATE_FAILURE: 'Unable to update security alert. Please try again.',
  PROJECT_ALERT_LIST_FAILURE: 'Unable to load security alerts. Please try again.',
  PROJECT_RECOMMENDATION_LIST_FAILURE: 'Unable to load security recommendations. Please try again.',
  PROJ_UPDATE_EMPTY: 'Provide at least one field to update.',
  PROJ_ALREADY_ARCHIVED: 'This project is already archived.',
  PROJECT_MEMBER_CONFLICT: 'This user is already a member of this project.',
  PROJECT_MEMBER_USER_NOT_FOUND: 'User not found. Verify the user ID and try again.',
  PROJECT_OWNER_MUTATION_NOT_ALLOWED: 'The owner role cannot be changed. Transfer ownership first.',
  PROJECT_MEMBER_LIST_FAILURE: 'Unable to load team members. Please try again.',
  PROJECT_MEMBER_ADD_FAILURE: 'Unable to add team member. Please try again.',
  PROJECT_MEMBER_UPDATE_FAILURE: 'Unable to update team member role. Please try again.',
  PROJECT_MEMBER_REMOVE_FAILURE: 'Unable to remove team member. Please try again.',
  SECRET_NAME_REQUIRED: 'Secret name is required.',
  SECRET_NAME_INVALID: 'Secret name can only contain uppercase letters, numbers, and underscores.',
  SECRET_VALUE_REQUIRED: 'Secret value cannot be empty.',
  SECRET_CONFLICT: 'A secret with this name already exists in this environment.',
  SECRET_NOT_FOUND: 'Secret not found. It may have been deleted.',
  SECRET_IMPORT_INVALID_FORMAT: 'Could not parse the secrets. Use KEY=VALUE format, one per line.',
  SECRET_IMPORT_EMPTY: 'No secrets to import. Add at least one KEY=VALUE pair.',
  SECRET_CREATE_FAILURE: 'Unable to create secret. Please try again.',
  SECRET_DELETE_FAILURE:
    'The server could not finish deleting this variable. It may have already been removed; refresh and try again.',
  SECRET_IMPORT_FAILURE: 'Unable to import secrets. Please try again.',
  SECRET_UPDATE_FAILURE: 'Unable to update this variable. Please try again.',
  SECRET_NOT_RESOLVABLE: 'One or more tokens cannot be resolved with current policy.',
  TOKEN_NOT_FOUND: 'Token not found. It may have already been revoked.',
  TOKEN_ALREADY_REVOKED: 'This token has already been revoked.',
  TOKEN_POLICY_DENIED: 'Token access denied. Check token expiry and device binding.',
  TOKEN_EXPIRY_INVALID: 'Token expiry must be a future date.',
  TOKEN_ISSUE_FAILURE: 'Unable to issue token. Please try again.',
  RESOLVE_BULK_FAILURE: 'Unable to resolve tokens. Please try again.',
  TOKEN_REVOKE_FAILURE: 'Unable to revoke token. Please try again.',
  ORG_DELETE_DEFAULT_NOT_ALLOWED: 'Your personal organisation cannot be deleted.',
  ORG_DELETE_HAS_PROJECTS: 'Delete all projects in this organisation before deleting it.',
  ORG_DELETE_HAS_MEMBERS: 'Remove all members from this organisation first.',
  ORG_OWNER_TRANSFER_REQUIRED: 'Transfer ownership to another member before leaving.',
  ORG_SWITCH_FAILURE: 'Unable to switch organisation. Please try again.',
  ORG_NOT_FOUND: 'Organisation not found or you no longer have access.',
  ORG_FORBIDDEN: 'You do not have permission to perform this action here.',
  ORG_SLUG_CONFLICT: 'That organisation URL is already taken.',
  INVITATION_ALREADY_USED: 'This invitation has already been accepted or declined.',
  INVITATION_EXPIRED: 'This invitation is no longer active. Ask the sender for a new invite.',
  INVITATION_NOT_FOUND: 'This invitation link is invalid or has been removed.',
  INVITATION_EMAIL_MISMATCH: 'Sign in with the email address that received this invitation.',
  ACCOUNT_DELETE_EMAIL_MISMATCH: 'The email you entered does not match your account.',
  AUTH_PENDING_REGISTRATION_NOT_FOUND:
    'This registration session expired. Start again to get a new code.',
  ACCOUNT_DELETE_FAILURE: 'Account deletion failed. No data was deleted. Please try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment before trying again.',
  REQUEST_TOO_LARGE: 'Your request is too large. Try reducing the amount of data.',
  ROUTE_NOT_FOUND: 'API endpoint not found.',
  INVALID_REQUEST: 'Invalid request. Check your input and try again.',
  INVALID_JSON: 'Request format error. Please reload and try again.',
  API_UPSTREAM_UNAVAILABLE:
    'The API service is temporarily unavailable. Please try again in a moment.',
}

const PREFER_SERVER_MESSAGE_CODES = new Set([
  'PROJECT_SLUG_CONFLICT',
  'AUTH_PASSWORD_TOO_WEAK',
  'PROJ_NAME_TOO_LONG',
  'PROJ_SLUG_INVALID',
  'AUTH_VALIDATION_ERROR',
  'PROJ_VALIDATION_ERROR',
  'SEC_VALIDATION_ERROR',
  'TOK_VALIDATION_ERROR',
])

export function getApiErrorPayload(error: unknown): ApiErrorResponse | null {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return null
  }

  const payload = error.response?.data
  if (!payload?.code && !payload?.error && !payload?.message) {
    return null
  }

  return {
    code: payload.code ?? 'UNKNOWN_ERROR',
    error: payload.error ?? payload.message ?? '',
    ...(payload.message ? { message: payload.message } : {}),
    ...(payload.requestId ? { requestId: payload.requestId } : {}),
    ...(payload.suggestedSlug ? { suggestedSlug: payload.suggestedSlug } : {}),
    ...(typeof payload.retryAfter === 'number' ? { retryAfter: payload.retryAfter } : {}),
    ...(payload.fields ? { fields: payload.fields } : {}),
  }
}

export function getApiErrorCode(error: unknown): string | null {
  return getApiErrorPayload(error)?.code ?? null
}

export function getApiErrorStatus(error: unknown): number | null {
  if (!axios.isAxiosError(error)) {
    return null
  }

  return error.response?.status ?? null
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  const payload = getApiErrorPayload(error)
  return payload?.error || payload?.message || fallback
}

export function getApiFriendlyMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (axios.isAxiosError(error) && !error.response) {
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_CANCELED') {
      return 'Request timed out. The server took too long to respond. Please try again.'
    }

    return 'Cannot connect to the server. Check your internet connection and try again.'
  }

  const payload = getApiErrorPayload(error)
  if (!payload) {
    return fallback
  }

  if (PREFER_SERVER_MESSAGE_CODES.has(payload.code)) {
    return payload.error || payload.message || fallback
  }

  if (API_ERROR_MESSAGES_BY_CODE[payload.code]) {
    return API_ERROR_MESSAGES_BY_CODE[payload.code]
  }

  return payload.error || payload.message || fallback
}

export function getApiFieldErrors(error: unknown): Record<string, string> | null {
  const payload = getApiErrorPayload(error)
  return payload?.fields ?? null
}

export function getApiFriendlyMessageWithRef(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  const message = getApiFriendlyMessage(error, fallback)
  const payload = getApiErrorPayload(error)

  if (payload?.requestId && axios.isAxiosError(error) && error.response?.status === 500) {
    return `${message} (ref: ${payload.requestId})`
  }

  return message
}
