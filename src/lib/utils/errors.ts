import axios from 'axios'

type ApiErrorPayload = {
  code?: string
  error?: string
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return fallback
  }

  return error.response?.data?.error ?? fallback
}

export function getApiErrorCode(error: unknown): string | null {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return null
  }

  return error.response?.data?.code ?? null
}
