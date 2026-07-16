import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { TokenIssueForm } from '../token-issue-form'

const mocks = vi.hoisted(() => ({
  issueToken: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/lib/hooks/use-tokens', () => ({
  useTokens: () => ({
    issueToken: { isPending: false, mutateAsync: mocks.issueToken },
  }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }),
}))

describe('TokenIssueForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.issueToken.mockResolvedValue({
      token: 'pv_tok_secret_once',
      tokenStart: 'pv_tok_secret',
      expiresAt: '2026-12-31T23:59:59.000Z',
      mode: 'compatibility',
    })
  })

  it('submits bounded IP and device token policies', async () => {
    render(<TokenIssueForm />)

    fireEvent.change(screen.getByLabelText('Secret ID'), { target: { value: 'secret_1' } })
    fireEvent.change(screen.getByLabelText('Allowed IP addresses'), {
      target: { value: '203.0.113.10, 2001:db8::10' },
    })
    fireEvent.change(screen.getByLabelText('Device fingerprint'), {
      target: { value: 'device:production-runner' },
    })
    fireEvent.change(screen.getByLabelText('Requests per second'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Total requests'), { target: { value: '500' } })
    fireEvent.change(screen.getByLabelText('Maximum lifetime in seconds'), {
      target: { value: '3600' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Issue token' }))

    await waitFor(() =>
      expect(mocks.issueToken).toHaveBeenCalledWith({
        secretId: 'secret_1',
        mode: 'compatibility',
        allowedIps: ['203.0.113.10', '2001:db8::10'],
        deviceFingerprint: 'device:production-runner',
        maxRequestsPerSecond: 5,
        maxRequestsTotal: 500,
        ttlSeconds: 3600,
      })
    )
  })

  it('blocks unsafe numeric policy values before calling the API', () => {
    render(<TokenIssueForm />)
    fireEvent.change(screen.getByLabelText('Secret ID'), { target: { value: 'secret_1' } })
    fireEvent.change(screen.getByLabelText('Requests per second'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Issue token' }))

    expect(screen.getByText('Enter a whole number between 1 and 10000.')).toBeInTheDocument()
    expect(mocks.issueToken).not.toHaveBeenCalled()
  })
})
