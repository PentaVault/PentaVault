import { fireEvent, render, screen } from '@testing-library/react'

import { PasswordInput } from '../password-input'

describe('PasswordInput', () => {
  it('reveals the password only while the peek button is held', () => {
    render(<PasswordInput aria-label="Password" defaultValue="secret-password" />)

    const input = screen.getByLabelText('Password')
    const peekButton = screen.getByRole('button', { name: 'Hold to show password' })

    expect(input).toHaveAttribute('type', 'password')

    fireEvent.pointerDown(peekButton)
    expect(input).toHaveAttribute('type', 'text')

    fireEvent.pointerUp(peekButton)
    expect(input).toHaveAttribute('type', 'password')
  })

  it('keeps the peek button out of the tab order', () => {
    render(<PasswordInput aria-label="Password" />)

    expect(screen.getByRole('button', { name: 'Hold to show password' })).toHaveAttribute(
      'tabIndex',
      '-1'
    )
  })
})
