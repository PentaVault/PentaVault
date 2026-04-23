import { getApiFieldErrors, getApiFriendlyMessage, getApiFriendlyMessageWithRef } from '../errors'

function createAxiosError(options: {
  status?: number
  data?: Record<string, unknown>
  code?: string
  withResponse?: boolean
}) {
  return {
    isAxiosError: true,
    code: options.code,
    response:
      options.withResponse === false
        ? undefined
        : {
            status: options.status,
            data: options.data,
          },
  }
}

describe('getApiFriendlyMessage', () => {
  it('returns network error message when response is missing', () => {
    expect(
      getApiFriendlyMessage(createAxiosError({ withResponse: false }), 'fallback message')
    ).toBe('Cannot connect to the server. Check your internet connection and try again.')
  })

  it('returns timeout message for ECONNABORTED', () => {
    expect(
      getApiFriendlyMessage(createAxiosError({ code: 'ECONNABORTED', withResponse: false }))
    ).toBe('Request timed out. The server took too long to respond. Please try again.')
  })

  it('returns server message for PROJECT_SLUG_CONFLICT', () => {
    expect(
      getApiFriendlyMessage(
        createAxiosError({
          status: 409,
          data: {
            code: 'PROJECT_SLUG_CONFLICT',
            error: "The slug 'demo' is already taken. Try 'demo-2'.",
          },
        })
      )
    ).toBe("The slug 'demo' is already taken. Try 'demo-2'.")
  })

  it('returns static registry message for PROJECT_NOT_FOUND', () => {
    expect(
      getApiFriendlyMessage(
        createAxiosError({
          status: 404,
          data: {
            code: 'PROJECT_NOT_FOUND',
            error: 'server message that should be ignored here',
          },
        })
      )
    ).toBe('Project not found. It may have been deleted or you may not have access.')
  })

  it('returns static registry message for MFA disable code expiry', () => {
    expect(
      getApiFriendlyMessage(
        createAxiosError({
          status: 400,
          data: {
            code: 'AUTH_MFA_DISABLE_CODE_EXPIRED',
            error: 'server message that should be ignored here',
          },
        })
      )
    ).toBe('That disable code expired. Request a new one.')
  })

  it('returns fallback for unknown error code', () => {
    expect(
      getApiFriendlyMessage(
        createAxiosError({
          status: 418,
          data: {
            code: 'UNKNOWN_BACKEND_ERROR',
          },
        }),
        'fallback message'
      )
    ).toBe('fallback message')
  })

  it('returns fallback for non-axios errors', () => {
    expect(getApiFriendlyMessage(new Error('boom'), 'fallback message')).toBe('fallback message')
  })
})

describe('getApiFieldErrors', () => {
  it('returns field map when server provides fields object', () => {
    expect(
      getApiFieldErrors(
        createAxiosError({
          status: 400,
          data: {
            code: 'AUTH_VALIDATION_ERROR',
            error: 'Please fix the fields below.',
            fields: {
              email: 'Please enter a valid email address.',
            },
          },
        })
      )
    ).toEqual({ email: 'Please enter a valid email address.' })
  })

  it('returns null when server does not provide fields', () => {
    expect(
      getApiFieldErrors(
        createAxiosError({
          status: 400,
          data: {
            code: 'INVALID_REQUEST',
            error: 'Invalid request.',
          },
        })
      )
    ).toBeNull()
  })

  it('returns null for non-axios errors', () => {
    expect(getApiFieldErrors(new Error('boom'))).toBeNull()
  })
})

describe('getApiFriendlyMessageWithRef', () => {
  it('appends requestId for 500 responses', () => {
    expect(
      getApiFriendlyMessageWithRef(
        createAxiosError({
          status: 500,
          data: {
            code: 'PROJECT_CREATE_FAILURE',
            error: 'Project creation failed unexpectedly. Please try again.',
            requestId: 'req_123',
          },
        })
      )
    ).toBe('Project creation failed unexpectedly. Please try again. (ref: req_123)')
  })

  it('does not append requestId for 4xx responses', () => {
    expect(
      getApiFriendlyMessageWithRef(
        createAxiosError({
          status: 409,
          data: {
            code: 'PROJECT_SLUG_CONFLICT',
            error: 'Slug conflict.',
            requestId: 'req_123',
          },
        })
      )
    ).toBe('Slug conflict.')
  })

  it('does not append requestId when requestId is absent', () => {
    expect(
      getApiFriendlyMessageWithRef(
        createAxiosError({
          status: 500,
          data: {
            code: 'PROJECT_CREATE_FAILURE',
            error: 'Project creation failed unexpectedly. Please try again.',
          },
        })
      )
    ).toBe('Project creation failed unexpectedly. Please try again.')
  })
})
