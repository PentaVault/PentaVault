'use client'

import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react'

type TurnstileWidgetProps = {
  siteKey: string | null
  onToken: (token: string) => void
}

export type TurnstileWidgetHandle = {
  reset: () => void
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'error-callback': () => void
          'expired-callback': () => void
          theme?: 'light' | 'dark' | 'auto'
        }
      ) => string
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
    }
  }
}

let turnstileScriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  if (window.turnstile) {
    return Promise.resolve()
  }

  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const rejectAndReset = () => {
        turnstileScriptPromise = null
        reject(new Error('Turnstile failed'))
      }
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
      )

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true })
        existingScript.addEventListener('error', rejectAndReset, { once: true })
        return
      }

      const script = document.createElement('script')
      script.async = true
      script.defer = true
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.onload = () => resolve()
      script.onerror = () => {
        script.remove()
        rejectAndReset()
      }
      document.head.append(script)
    })
  }

  return turnstileScriptPromise
}

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ siteKey, onToken }, ref) {
    const id = useId()
    const containerRef = useRef<HTMLDivElement | null>(null)
    const widgetIdRef = useRef<string | null>(null)

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          onToken('')
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current)
          }
        },
      }),
      [onToken]
    )

    useEffect(() => {
      if (!siteKey || !containerRef.current) {
        return
      }

      let widgetId: string | null = null
      let cancelled = false

      loadTurnstileScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) {
            return
          }

          widgetId = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: onToken,
            'error-callback': () => onToken(''),
            'expired-callback': () => onToken(''),
            theme: 'auto',
          })
          widgetIdRef.current = widgetId
        })
        .catch(() => onToken(''))

      return () => {
        cancelled = true
        if (widgetId && window.turnstile) {
          window.turnstile.remove(widgetId)
        }
        widgetIdRef.current = null
      }
    }, [onToken, siteKey])

    if (!siteKey) {
      return null
    }

    return <div aria-live="polite" id={id} ref={containerRef} />
  }
)
