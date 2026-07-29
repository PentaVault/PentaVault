import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { SsoSignInButton } from '../sso-sign-in-button'

const discover = vi.fn()
const toastError = vi.fn()
const assign = vi.fn()

vi.mock('@/lib/api/sso', () => ({
  ssoApi: { discover: (email: string) => discover(email) },
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { error: toastError, success: vi.fn() } }),
}))

vi.mock('@/lib/env', () => ({
  env: { apiUrl: 'https://api.pentavault.test' },
}))

describe('SsoSignInButton', () => {
  beforeEach(() => {
    discover.mockReset()
    toastError.mockReset()
    assign.mockReset()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign },
    })
  })

  it('will not look up an address that is not an email', async () => {
    render(<SsoSignInButton email="not-an-email" />)
    fireEvent.click(screen.getByRole('button', { name: /sign in with sso/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/work email/i))
    })
    expect(discover).not.toHaveBeenCalled()
  })

  it('sends the browser to the authorize endpoint for a single match', async () => {
    discover.mockResolvedValue({ connections: [{ id: 'sso-1', label: 'Acme Okta' }] })
    render(<SsoSignInButton email="Ada@Acme.com" nextPath="/projects" />)

    fireEvent.click(screen.getByRole('button', { name: /sign in with sso/i }))

    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith(
        'https://api.pentavault.test/api/auth/sso/authorize?connectionId=sso-1&callbackURL=%2Fprojects'
      )
    })
    // The lookup is domain-based, so the address is normalised first.
    expect(discover).toHaveBeenCalledWith('ada@acme.com')
  })

  it('offers a choice when an address matches several providers', async () => {
    discover.mockResolvedValue({
      connections: [
        { id: 'sso-1', label: 'Acme Okta' },
        { id: 'sso-2', label: 'Acme Entra' },
      ],
    })
    render(<SsoSignInButton email="ada@acme.com" />)

    fireEvent.click(screen.getByRole('button', { name: /sign in with sso/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Acme Entra' })).toBeVisible()
    })
    // Picking for the user could send them to the wrong directory.
    expect(assign).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Acme Entra' }))
    expect(assign).toHaveBeenCalledWith(expect.stringContaining('connectionId=sso-2'))
  })

  it('does not confirm whether a domain is onboarded', async () => {
    discover.mockResolvedValue({ connections: [] })
    render(<SsoSignInButton email="ada@unknown.example" />)

    fireEvent.click(screen.getByRole('button', { name: /sign in with sso/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Single sign-on is not set up for this email address.'
      )
    })
    expect(assign).not.toHaveBeenCalled()
  })

  it('reports a lookup failure without navigating', async () => {
    discover.mockRejectedValue(new Error('network'))
    render(<SsoSignInButton email="ada@acme.com" />)

    fireEvent.click(screen.getByRole('button', { name: /sign in with sso/i }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Unable to start single sign-on right now.')
    })
    expect(assign).not.toHaveBeenCalled()
  })

  it('omits the return path when there is none to preserve', async () => {
    discover.mockResolvedValue({ connections: [{ id: 'sso-1', label: 'Acme Okta' }] })
    render(<SsoSignInButton email="ada@acme.com" />)

    fireEvent.click(screen.getByRole('button', { name: /sign in with sso/i }))

    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith(expect.not.stringContaining('callbackURL'))
    })
  })
})
