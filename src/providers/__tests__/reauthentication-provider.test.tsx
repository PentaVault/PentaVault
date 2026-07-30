import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { requestFreshSession, resetReauthenticationState } from '@/lib/api/reauthentication'
import { ReauthenticationProvider } from '@/providers/reauthentication-provider'

const authApiMock = vi.hoisted(() => ({
  reauthenticate: vi.fn(),
}))

vi.mock('@/lib/api/auth', () => ({
  authApi: { reauthenticate: authApiMock.reauthenticate },
}))

describe('ReauthenticationProvider', () => {
  beforeEach(() => {
    resetReauthenticationState()
    authApiMock.reauthenticate.mockReset()
  })

  afterEach(() => {
    resetReauthenticationState()
  })

  function renderProvider() {
    return render(
      <ReauthenticationProvider>
        <p>dashboard</p>
      </ReauthenticationProvider>
    )
  }

  it('stays out of the way until a session goes stale', () => {
    renderProvider()

    // The prompt interrupts whatever the user was doing, so it must appear only
    // when something actually asked for it.
    expect(screen.getByText('dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Confirm your password')).not.toBeInTheDocument()
  })

  it('confirms the password and reports the session fresh', async () => {
    const user = userEvent.setup()
    authApiMock.reauthenticate.mockResolvedValue(true)
    renderProvider()

    const pending = requestFreshSession()
    await screen.findByText('Confirm your password')

    await user.type(screen.getByLabelText('Password'), 'correct-horse')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await expect(pending).resolves.toBe(true)
    expect(authApiMock.reauthenticate).toHaveBeenCalledWith('correct-horse')
  })

  it('keeps the prompt open on a wrong password', async () => {
    const user = userEvent.setup()
    authApiMock.reauthenticate.mockResolvedValue(false)
    renderProvider()

    void requestFreshSession()
    await screen.findByText('Confirm your password')

    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    // Closing on a mistyped character would throw away the action the user was
    // part-way through.
    expect(await screen.findByRole('alert')).toHaveTextContent('That password is incorrect.')
    expect(screen.getByText('Confirm your password')).toBeInTheDocument()
  })

  it('clears the field after a wrong password', async () => {
    const user = userEvent.setup()
    authApiMock.reauthenticate.mockResolvedValue(false)
    renderProvider()

    void requestFreshSession()
    await screen.findByText('Confirm your password')

    const field = screen.getByLabelText('Password')
    await user.type(field, 'wrong')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await screen.findByRole('alert')
    expect(field).toHaveValue('')
  })

  it('reports a refusal when the user cancels', async () => {
    const user = userEvent.setup()
    renderProvider()

    const pending = requestFreshSession()
    await screen.findByText('Confirm your password')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    // The waiting request has to be told, or it hangs forever.
    await expect(pending).resolves.toBe(false)
    expect(authApiMock.reauthenticate).not.toHaveBeenCalled()
  })

  it('settles the waiting request when the provider unmounts', async () => {
    const { unmount } = renderProvider()

    const pending = requestFreshSession()
    await screen.findByText('Confirm your password')

    unmount()

    // A navigation that drops the provider must not leave the interceptor
    // waiting on a promise nothing will ever resolve.
    await expect(pending).resolves.toBe(false)
  })

  it('surfaces a network failure rather than calling it a wrong password', async () => {
    const user = userEvent.setup()
    authApiMock.reauthenticate.mockRejectedValue(new Error('offline'))
    renderProvider()

    void requestFreshSession()
    await screen.findByText('Confirm your password')

    await user.type(screen.getByLabelText('Password'), 'correct-horse')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    const alert = await screen.findByRole('alert')
    expect(alert).not.toHaveTextContent('That password is incorrect.')
  })

  it('does not submit an empty password', async () => {
    const user = userEvent.setup()
    renderProvider()

    void requestFreshSession()
    await screen.findByText('Confirm your password')

    const confirm = screen.getByRole('button', { name: 'Confirm' })
    expect(confirm).toBeDisabled()

    await user.click(confirm)
    await waitFor(() => {
      expect(authApiMock.reauthenticate).not.toHaveBeenCalled()
    })
  })
})
