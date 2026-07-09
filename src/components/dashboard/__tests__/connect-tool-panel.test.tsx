import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConnectToolPanel } from '@/components/dashboard/connect-tool-panel'
import { SETTINGS_ACCOUNT_TOKENS_PATH } from '@/lib/constants'

describe('ConnectToolPanel', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('links to the account tokens page for creating a machine API key', () => {
    render(<ConnectToolPanel />)

    const link = screen.getByRole('link', { name: /account tokens page/i })
    expect(link).toHaveAttribute('href', SETTINGS_ACCOUNT_TOKENS_PATH)
  })

  it('shows the machine authentication commands', () => {
    render(<ConnectToolPanel />)

    expect(screen.getAllByText(/pv login/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/pv login --token-stdin/).length).toBeGreaterThan(0)
  })

  it('includes the projectId in the pv projects select snippet', () => {
    render(<ConnectToolPanel projectId="proj_123" />)

    expect(screen.getAllByText(/pv projects select proj_123/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/pv envs select development/).length).toBeGreaterThan(0)
  })

  it('renders the Node launch command by default', () => {
    render(<ConnectToolPanel />)

    expect(screen.getAllByText(/pv run -- npm run dev/).length).toBeGreaterThan(0)
  })

  it('switches the launch command when a different stack is selected', async () => {
    const user = userEvent.setup()
    render(<ConnectToolPanel />)

    await user.click(screen.getByRole('tab', { name: 'Python' }))

    expect(screen.getAllByText(/pv run -- python app\.py/).length).toBeGreaterThan(0)
  })

  it('renders the security callout about unauthenticated machines', () => {
    render(<ConnectToolPanel />)

    expect(screen.getByText(/no secrets ever touch disk/i)).toBeInTheDocument()
  })
})
