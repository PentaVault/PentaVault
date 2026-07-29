import { fireEvent, render, screen } from '@testing-library/react'

import type { Announcement } from '@/lib/types/api'

import { AnnouncementStrip } from '../announcement-strip'

const useAnnouncements = vi.fn<() => Announcement[]>()

vi.mock('@/providers/platform-provider', () => ({
  useAnnouncements: () => useAnnouncements(),
}))

function makeAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: 'announcement-1',
    title: 'Scheduled maintenance',
    body: null,
    severity: 'info',
    audience: 'all',
    organizationId: null,
    active: true,
    startsAt: null,
    endsAt: null,
    dismissible: true,
    linkUrl: null,
    linkLabel: null,
    createdByUserId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('AnnouncementStrip', () => {
  beforeEach(() => {
    useAnnouncements.mockReset()
    window.localStorage.clear()
  })

  it('renders nothing when there are no announcements', () => {
    useAnnouncements.mockReturnValue([])
    const { container } = render(<AnnouncementStrip />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the title and body', () => {
    useAnnouncements.mockReturnValue([
      makeAnnouncement({ title: 'Gateway degraded', body: 'Proxy latency is elevated.' }),
    ])
    render(<AnnouncementStrip />)

    expect(screen.getByText('Gateway degraded')).toBeInTheDocument()
    expect(screen.getByText('Proxy latency is elevated.')).toBeInTheDocument()
  })

  it('renders every active announcement', () => {
    useAnnouncements.mockReturnValue([
      makeAnnouncement({ id: 'a', title: 'First' }),
      makeAnnouncement({ id: 'b', title: 'Second' }),
    ])
    render(<AnnouncementStrip />)

    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })

  it('announces a critical notice assertively', () => {
    useAnnouncements.mockReturnValue([makeAnnouncement({ severity: 'critical' })])
    render(<AnnouncementStrip />)

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'assertive')
  })

  it('announces a non-critical notice politely', () => {
    useAnnouncements.mockReturnValue([makeAnnouncement({ severity: 'info' })])
    render(<AnnouncementStrip />)

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('hides an announcement once dismissed and persists the choice', () => {
    const announcement = makeAnnouncement({ title: 'Dismiss me' })
    useAnnouncements.mockReturnValue([announcement])
    const { unmount } = render(<AnnouncementStrip />)

    fireEvent.click(screen.getByRole('button', { name: /Dismiss announcement/ }))
    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument()

    // A reload must not bring it back.
    unmount()
    render(<AnnouncementStrip />)
    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument()
  })

  it('resurfaces a dismissed announcement after it is edited', () => {
    const announcement = makeAnnouncement({ title: 'Incident' })
    useAnnouncements.mockReturnValue([announcement])
    const { unmount } = render(<AnnouncementStrip />)
    fireEvent.click(screen.getByRole('button', { name: /Dismiss announcement/ }))
    unmount()

    // Escalating the incident bumps updatedAt, which must re-show the strip.
    useAnnouncements.mockReturnValue([
      { ...announcement, severity: 'critical', updatedAt: '2026-07-02T00:00:00.000Z' },
    ])
    render(<AnnouncementStrip />)

    expect(screen.getByText('Incident')).toBeInTheDocument()
  })

  it('does not offer dismissal for a non-dismissible announcement', () => {
    useAnnouncements.mockReturnValue([makeAnnouncement({ dismissible: false })])
    render(<AnnouncementStrip />)

    expect(screen.queryByRole('button', { name: /Dismiss announcement/ })).not.toBeInTheDocument()
  })

  it('renders a link with its custom label', () => {
    useAnnouncements.mockReturnValue([
      makeAnnouncement({ linkUrl: 'https://status.example.com', linkLabel: 'Status page' }),
    ])
    render(<AnnouncementStrip />)

    const link = screen.getByRole('link', { name: 'Status page' })
    expect(link).toHaveAttribute('href', 'https://status.example.com')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('falls back to a default link label', () => {
    useAnnouncements.mockReturnValue([
      makeAnnouncement({ linkUrl: 'https://status.example.com', linkLabel: null }),
    ])
    render(<AnnouncementStrip />)

    expect(screen.getByRole('link', { name: 'Learn more' })).toBeInTheDocument()
  })

  it('survives a corrupt dismissal store', () => {
    window.localStorage.setItem('pv:dismissed-announcements', 'not-json')
    useAnnouncements.mockReturnValue([makeAnnouncement({ title: 'Still visible' })])

    expect(() => render(<AnnouncementStrip />)).not.toThrow()
    expect(screen.getByText('Still visible')).toBeInTheDocument()
  })
})
