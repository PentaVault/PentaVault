import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'

import { PlatformProvider, useAnnouncements, useFeatureFlag } from '../platform-provider'

const getContext = vi.fn()

vi.mock('@/lib/api/platform', () => ({
  platformApi: {
    getContext: () => getContext(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <PlatformProvider>{children}</PlatformProvider>
      </QueryClientProvider>
    )
  }
}

function FlagProbe({ flagKey }: { flagKey: string }) {
  const enabled = useFeatureFlag(flagKey)
  return <span data-testid="flag">{enabled ? 'on' : 'off'}</span>
}

function AnnouncementProbe() {
  const announcements = useAnnouncements()
  return <span data-testid="count">{announcements.length}</span>
}

describe('PlatformProvider', () => {
  beforeEach(() => {
    getContext.mockReset()
  })

  it('exposes a resolved flag as enabled', async () => {
    getContext.mockResolvedValue({ flags: { 'new-billing': true }, announcements: [] })
    render(<FlagProbe flagKey="new-billing" />, { wrapper: createWrapper() })

    await waitFor(() => expect(screen.getByTestId('flag')).toHaveTextContent('on'))
  })

  it('resolves a disabled flag as off', async () => {
    getContext.mockResolvedValue({ flags: { 'new-billing': false }, announcements: [] })
    render(<FlagProbe flagKey="new-billing" />, { wrapper: createWrapper() })

    await waitFor(() => expect(screen.getByTestId('flag')).toHaveTextContent('off'))
  })

  it('treats an unknown flag key as disabled', async () => {
    getContext.mockResolvedValue({ flags: {}, announcements: [] })
    render(<FlagProbe flagKey="never-created" />, { wrapper: createWrapper() })

    await waitFor(() => expect(screen.getByTestId('flag')).toHaveTextContent('off'))
  })

  it('defaults to disabled before the request resolves', () => {
    getContext.mockReturnValue(new Promise(() => {}))
    render(<FlagProbe flagKey="new-billing" />, { wrapper: createWrapper() })

    // Never flash a gated feature on while loading.
    expect(screen.getByTestId('flag')).toHaveTextContent('off')
  })

  it('degrades to disabled when the platform endpoint fails', async () => {
    getContext.mockRejectedValue(new Error('network down'))
    render(<FlagProbe flagKey="new-billing" />, { wrapper: createWrapper() })

    await waitFor(() => expect(screen.getByTestId('flag')).toHaveTextContent('off'))
  })

  it('exposes announcements to consumers', async () => {
    getContext.mockResolvedValue({
      flags: {},
      announcements: [{ id: 'a' }, { id: 'b' }],
    })
    render(<AnnouncementProbe />, { wrapper: createWrapper() })

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'))
  })
})
