import axios from 'axios'

import type { ApiErrorResponse } from '@/lib/types/api'

type ApiErrorPayload = {
  code?: string
  error?: string
  message?: string
  requestId?: string
  suggestedSlug?: string
}

const API_ERROR_MESSAGES_BY_CODE: Record<string, string> = {
  UNAUTHORIZED: 'Authentication is required. Please sign in again.',
  AUTH_FAILURE: 'Authentication service is temporarily unavailable. Please try again.',
  ORG_DELETE_DEFAULT_NOT_ALLOWED: 'Your personal organisation cannot be deleted.',
  ORG_DELETE_HAS_PROJECTS: 'Delete all projects in this organisation before deleting it.',
  ORG_DELETE_HAS_MEMBERS: 'Remove all members from this organisation before deleting it.',
  ORG_OWNER_TRANSFER_REQUIRED: 'Transfer ownership to another member before deleting your account.',
  ACCOUNT_DELETE_EMAIL_MISMATCH: 'The email address entered does not match your account.',
  ACCOUNT_DELETE_FAILURE: 'Account deletion failed. No data was deleted. Please try again.',
  ORG_SWITCH_FAILURE: 'Unable to switch organisation right now. Please try again.',
  ORG_NOT_FOUND: 'Organisation not found or you no longer have access.',
  ORG_FORBIDDEN: 'You do not have permission to perform this action in this organisation.',
  INVALID_REQUEST: 'Some request details are invalid. Review your input and retry.',
  VALIDATION_ERROR: 'Some request details are invalid. Review your input and retry.',
  SESSION_NOT_FOUND: 'Session not found. It may already be revoked.',
  API_KEY_NOT_ALLOWED: 'Fallback API keys are not permitted for this endpoint.',
  DEVICE_REQUEST_NOT_FOUND: 'Device request not found or expired. Start sign in again from CLI.',
  DEVICE_APPROVAL_FAILED: 'Device approval failed. Verify the code and try again.',
  PROJECT_FORBIDDEN: 'You do not have permission to perform this action in this project.',
  PROJECT_NOT_FOUND: 'The requested project was not found or is no longer accessible.',
  PROJECT_SLUG_CONFLICT: 'That project slug is already in use. Choose another slug.',
  PROJECT_CREATE_FAILURE: 'Unable to create project right now. Please try again.',
  PROJECT_READ_FAILURE: 'Unable to load project details right now. Please refresh and try again.',
  PROJECT_UPDATE_FAILURE: 'Unable to update project right now. Please try again.',
  PROJECT_DELETE_FAILURE: 'Unable to delete project right now. Please try again.',
  PROJECT_LIST_FAILURE: 'Unable to load projects right now. Please refresh and try again.',
  PROJECT_AUDIT_READ_FAILURE: 'Unable to load project audit log right now. Please try again.',
  PROJECT_ALERT_NOT_FOUND: 'Security alert not found for this project.',
  PROJECT_ALERT_CREATE_FAILURE:
    'Unable to create project security alert right now. Please try again.',
  PROJECT_ALERT_UPDATE_FAILURE:
    'Unable to update project security alert right now. Please try again.',
  PROJECT_ALERT_LIST_FAILURE: 'Unable to load project security alerts right now. Please try again.',
  PROJECT_RECOMMENDATION_LIST_FAILURE:
    'Unable to load security recommendations right now. Please try again.',
  PROJECT_MEMBER_CONFLICT: 'That user is already a member of this project.',
  PROJECT_MEMBER_USER_NOT_FOUND: 'That user could not be found. Verify the user ID and try again.',
  PROJECT_OWNER_MUTATION_NOT_ALLOWED: 'Owner membership cannot be changed with this action.',
  PROJECT_MEMBER_LIST_FAILURE: 'Unable to load project members right now. Please try again.',
  PROJECT_MEMBER_ADD_FAILURE: 'Unable to add project member right now. Please try again.',
  PROJECT_MEMBER_UPDATE_FAILURE: 'Unable to update project member right now. Please try again.',
  PROJECT_MEMBER_REMOVE_FAILURE: 'Unable to remove project member right now. Please try again.',
  SECRET_CONFLICT: 'A secret with this name already exists in the selected environment.',
  SECRET_NOT_RESOLVABLE: 'One or more tokens cannot be resolved with current policy or context.',
  SECRET_CREATE_FAILURE: 'Unable to create secret right now. Please try again.',
  SECRET_IMPORT_FAILURE: 'Unable to import secrets right now. Please try again.',
  TOKEN_ISSUE_FAILURE: 'Unable to issue token right now. Please try again.',
  RESOLVE_BULK_FAILURE: 'Unable to resolve tokens right now. Please try again.',
  TOKEN_NOT_FOUND: 'The requested token was not found.',
  TOKEN_REVOKE_FAILURE: 'Unable to revoke token right now. Please try again.',
  TOKEN_POLICY_DENIED: 'Token policy denied this request. Review token mode and session binding.',
  RATE_LIMITED: 'Too many requests. Please wait and try again.',
}

const API_CODES_PREFERRING_SERVER_MESSAGE = new Set(['PROJECT_SLUG_CONFLICT'])

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return fallback
  }

  return error.response?.data?.error ?? error.response?.data?.message ?? fallback
}

export function getApiErrorPayload(error: unknown): ApiErrorResponse | null {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return null
  }

  const payload = error.response?.data
  if (!payload?.code && !payload?.error && !payload?.message) {
    return null
  }

  const response: ApiErrorResponse = {
    code: payload.code ?? 'UNKNOWN_ERROR',
    error: payload.error ?? payload.message ?? 'Something went wrong',
  }

  if (payload.message) {
    response.message = payload.message
  }

  if (payload.requestId) {
    response.requestId = payload.requestId
  }

  if (payload.suggestedSlug) {
    response.suggestedSlug = payload.suggestedSlug
  }

  return response
}

export function getApiErrorCode(error: unknown): string | null {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return null
  }

  return error.response?.data?.code ?? null
}

export function getApiErrorStatus(error: unknown): number | null {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return null
  }

  return error.response?.status ?? null
}

export function getApiFriendlyMessage(error: unknown, fallback = 'Something went wrong'): string {
  const payload = getApiErrorPayload(error)
  if (payload?.code && API_CODES_PREFERRING_SERVER_MESSAGE.has(payload.code)) {
    return payload.error || payload.message || fallback
  }

  const code = getApiErrorCode(error)

  if (code && API_ERROR_MESSAGES_BY_CODE[code]) {
    return API_ERROR_MESSAGES_BY_CODE[code]
  }

  return getApiErrorMessage(error, fallback)
}
