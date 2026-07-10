import { act } from '@testing-library/react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'

import { useHydrated } from '@/lib/hooks/use-hydrated'

function HydrationProbe() {
  return <span>{useHydrated() ? 'client' : 'server'}</span>
}

describe('useHydrated', () => {
  it('keeps the server snapshot stable through hydration', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const container = document.createElement('div')
    container.innerHTML = renderToString(<HydrationProbe />)
    document.body.append(container)
    expect(container).toHaveTextContent('server')

    let root: Root | undefined
    await act(async () => {
      root = hydrateRoot(container, <HydrationProbe />)
    })

    expect(container).toHaveTextContent('client')
    expect(consoleError.mock.calls.some((call) => String(call[0]).includes('hydration'))).toBe(
      false
    )

    await act(async () => root?.unmount())
    container.remove()
    consoleError.mockRestore()
  })
})
