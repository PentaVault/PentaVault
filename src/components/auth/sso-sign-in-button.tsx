'use client'

import { Building2, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ssoApi } from '@/lib/api/sso'
import { env } from '@/lib/env'
import { useToast } from '@/lib/hooks/use-toast'
import type { SsoDiscoveredConnection } from '@/lib/types/api'

/**
 * The sign-in flow lives on the backend's better-auth surface, so this is a
 * full navigation rather than a fetch — the browser has to follow the redirect
 * to the identity provider and come back carrying a session cookie.
 */
function beginSso(connectionId: string, nextPath: string | null): void {
  const url = new URL('/api/auth/sso/authorize', env.apiUrl)
  url.searchParams.set('connectionId', connectionId)
  if (nextPath) {
    url.searchParams.set('callbackURL', nextPath)
  }
  window.location.assign(url.toString())
}

export function SsoSignInButton({ email, nextPath }: { email: string; nextPath?: string | null }) {
  const { toast } = useToast()
  const [isPending, setIsPending] = useState(false)
  const [choices, setChoices] = useState<SsoDiscoveredConnection[]>([])

  async function handleClick(): Promise<void> {
    const normalized = email.trim().toLowerCase()
    if (!normalized.includes('@')) {
      toast.error('Enter your work email address first.')
      return
    }

    setIsPending(true)
    try {
      const { connections } = await ssoApi.discover(normalized)

      if (connections.length === 0) {
        // Deliberately not "no such organisation": discovery is unauthenticated
        // and must not confirm which domains are onboarded.
        toast.error('Single sign-on is not set up for this email address.')
        return
      }

      if (connections.length === 1) {
        beginSso(connections[0].id, nextPath ?? null)
        return
      }

      setChoices(connections)
    } catch {
      toast.error('Unable to start single sign-on right now.')
    } finally {
      setIsPending(false)
    }
  }

  if (choices.length > 1) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          This address matches more than one provider. Choose the one to use.
        </p>
        {choices.map((connection) => (
          <Button
            className="w-full gap-2"
            key={connection.id}
            onClick={() => beginSso(connection.id, nextPath ?? null)}
            type="button"
            variant="outline"
          >
            <Building2 className="h-4 w-4" />
            {connection.label}
          </Button>
        ))}
      </div>
    )
  }

  return (
    <Button
      className="w-full gap-2"
      disabled={isPending}
      onClick={() => void handleClick()}
      type="button"
      variant="outline"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
      {isPending ? 'Looking up your organisation...' : 'Sign in with SSO'}
    </Button>
  )
}
