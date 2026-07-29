import { fireEvent, render, screen } from '@testing-library/react'

import { CodeShowcase } from '../code-showcase'
import { Faq } from '../faq'
import { HowItWorks } from '../how-it-works'
import { SecuritySection } from '../security-section'

describe('HowItWorks', () => {
  it('explains the three-step proxy flow in order', () => {
    render(<HowItWorks />)

    const steps = screen.getAllByRole('listitem')
    expect(steps).toHaveLength(3)
    expect(steps[0]).toHaveTextContent('Store the real key once')
    expect(steps[1]).toHaveTextContent('Issue a scoped proxy token')
    expect(steps[2]).toHaveTextContent('PentaVault makes the call')
  })

  it('is linkable from the header nav', () => {
    const { container } = render(<HowItWorks />)
    expect(container.querySelector('#how-it-works')).not.toBeNull()
  })
})

describe('CodeShowcase', () => {
  it('shows the CLI sample first', () => {
    render(<CodeShowcase />)

    expect(screen.getByRole('tab', { name: 'CLI' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/pv run -- npm start/)).toBeInTheDocument()
  })

  it('switches samples when another tab is chosen', () => {
    render(<CodeShowcase />)

    fireEvent.click(screen.getByRole('tab', { name: 'Proxy' }))

    expect(screen.getByRole('tab', { name: 'Proxy' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/gateway.pentavault.dev/)).toBeInTheDocument()
    expect(screen.queryByText(/pv run -- npm start/)).not.toBeInTheDocument()
  })

  it('exposes every sample as a tab', () => {
    render(<CodeShowcase />)
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })

  it('never shows a literal secret value in a sample', () => {
    render(<CodeShowcase />)

    // The marketing page must not model bad practice by inlining a key.
    for (const tab of screen.getAllByRole('tab')) {
      fireEvent.click(tab)
      const panel = screen.getByRole('tabpanel')
      expect(panel.textContent).not.toMatch(/sk-[a-zA-Z0-9]/)
    }
  })
})

describe('SecuritySection', () => {
  it('leads with the fail-closed guarantee', () => {
    render(<SecuritySection />)

    expect(screen.getByRole('heading', { name: /Built to fail closed/ })).toBeInTheDocument()
    expect(screen.getByText('Deny by default')).toBeInTheDocument()
  })
})

describe('Faq', () => {
  it('renders each question collapsed by default', () => {
    render(<Faq />)

    const questions = screen.getAllByRole('group')
    expect(questions.length).toBeGreaterThan(0)
    for (const question of questions) {
      expect(question).not.toHaveAttribute('open')
    }
  })

  it('addresses the availability objection directly', () => {
    render(<Faq />)
    expect(screen.getByText(/What happens if PentaVault is down/)).toBeInTheDocument()
  })
})
