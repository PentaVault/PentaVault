import { render, screen } from '@testing-library/react'

import { DashboardNavLink } from '../dashboard-nav-link'

const usePathname = jest.fn()

jest.mock('next/navigation', () => ({
  usePathname: () => usePathname(),
}))

describe('DashboardNavLink', () => {
  beforeEach(() => {
    usePathname.mockReset()
  })

  it('is active when pathname exactly matches href with exact=true', () => {
    usePathname.mockReturnValue('/dashboard')
    render(<DashboardNavLink exact href="/dashboard" label="Overview" />)

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
  })

  it('is active when pathname starts with href with exact=false', () => {
    usePathname.mockReturnValue('/settings/account')
    render(<DashboardNavLink href="/settings" label="Settings" />)

    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
  })

  it('is not active when pathname does not match', () => {
    usePathname.mockReturnValue('/projects')
    render(<DashboardNavLink href="/settings" label="Settings" />)

    expect(screen.getByRole('link', { name: 'Settings' })).not.toHaveAttribute('aria-current')
  })

  it('renders immediately with correct active state no flash', () => {
    usePathname.mockReturnValue('/projects')
    render(<DashboardNavLink exact href="/projects" label="Projects" />)

    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page')
  })
})
