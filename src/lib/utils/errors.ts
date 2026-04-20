import axios from 'axios'

type ApiErrorPayload = {
  code?: string
  error?: string
  message?: string
}

const API_ERROR_MESSAGES_BY_CODE: Record<string, string> = {
  UNAUTHORIZED: 'Authentication is required. Please sign in again.',
  AUTH_FAILURE: 'Authentication service is temporarily unavailable. Please try again.',
  INVALID_REQUEST: 'Some request details are invalid. Review your input and retry.',
  VALIDATION_ERROR: 'Some request details are invalid. Review your input and retry.',
  SESSION_NOT_FOUND: 'Session not found. It may already be revoked.',
  API_KEY_NOT_ALLOWED: 'Fallback API keys are not permitted for this endpoint.',
  DEVICE_REQUEST_NOT_FOUND: 'Device request not found or expired. Start sign in again from CLI.',
  DEVICE_APPROVAL_FAILED: 'Device approval failed. Verify the code and try again.',
  PROJECT_FORBIDDEN: 'You do not have permission to perform this action in this project.',
  PROJECT_NOT_FOUND: 'The requested project was not found or is no longer accessible.',
  PROJECT_SLUG_CONFLICT: 'That project slug is already in use. Choose another slug.',
  PROJECT_MEMBER_CONFLICT: 'That user is already a member of this project.',
  PROJECT_OWNER_MUTATION_NOT_ALLOWED: 'Owner membership cannot be changed with this action.',
  TOKEN_NOT_FOUND: 'The requested token was not found.',
  TOKEN_POLICY_DENIED: 'Token policy denied this request. Review token mode and session binding.',
  RATE_LIMITED: 'Too many requests. Please wait and try again.',
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return fallback
  }

  return error.response?.data?.error ?? error.response?.data?.message ?? fallback
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
  const code = getApiErrorCode(error)

  if (code && API_ERROR_MESSAGES_BY_CODE[code]) {
    return API_ERROR_MESSAGES_BY_CODE[code]
  }

  return getApiErrorMessage(error, fallback)
}
