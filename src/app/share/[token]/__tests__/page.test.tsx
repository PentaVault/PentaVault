import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import SharedSecretPage from '../page'

const mocks = vi.hoisted(() => ({
  inspect: vi.fn(),
  access: vi.fn(),
  params: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useParams: mocks.params,
}))

vi.mock('@/lib/api/secret-shares', () => ({
  secretSharesApi: { inspect: mocks.inspect, access: mocks.access },
}))

const publicShare = {
  id: 'share_1',
  name: 'Vendor handoff',
  secretName: 'STRIPE_KEY',
  accessScope: 'anyone',
  expiresAt: '2026-07-17T00:00:00.000Z',
  maxViews: 2,
  remainingViews: 2,
  passwordProtected: true,
} as const

describe('shared secret page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.inspect.mockResolvedValue({ share: publicShare })
    mocks.params.mockReturnValue({ token: `pvs_${'a'.repeat(43)}` })
    mocks.access.mockResolvedValue({
      share: { ...publicShare, remainingViews: 1 },
      value: 'sk_live_once',
    })
  })

  it('inspects without consuming and reveals only after explicit confirmation', async () => {
    render(<SharedSecretPage />)

    expect(await screen.findByText('Vendor handoff')).toBeInTheDocument()
    expect(mocks.inspect).toHaveBeenCalledTimes(1)
    expect(mocks.access).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Share password'), {
      target: { value: 'strong-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reveal secret once' }))

    await waitFor(() =>
      expect(mocks.access).toHaveBeenCalledWith(`pvs_${'a'.repeat(43)}`, 'strong-password')
    )
    expect(await screen.findByText('sk_live_once')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear from screen' }))
    expect(screen.queryByText('sk_live_once')).not.toBeInTheDocument()
    expect(screen.getByText('Value cleared from this screen')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reveal secret once' })).not.toBeInTheDocument()
  })

  it('does not expose invalid-link details', async () => {
    mocks.inspect.mockRejectedValueOnce(new Error('database detail'))
    render(<SharedSecretPage />)
    expect(await screen.findByText('Share unavailable')).toBeInTheDocument()
    expect(screen.queryByText('database detail')).not.toBeInTheDocument()
  })

  it('reads new share tokens from the URL fragment', async () => {
    mocks.params.mockReturnValue({})
    window.location.hash = `pvs_${'b'.repeat(43)}`
    render(<SharedSecretPage />)

    await waitFor(() => expect(mocks.inspect).toHaveBeenCalledWith(`pvs_${'b'.repeat(43)}`))
    expect(await screen.findByText('Vendor handoff')).toBeInTheDocument()
    window.location.hash = ''
  })
})
