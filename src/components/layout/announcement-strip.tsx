'use client'

import { AlertTriangle, Info, OctagonAlert, Wrench, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { Announcement, AnnouncementSeverity } from '@/lib/types/api'
import { cn } from '@/lib/utils/cn'
import { useAnnouncements } from '@/providers/platform-provider'

const DISMISSED_STORAGE_KEY = 'pv:dismissed-announcements'

const SEVERITY_STYLES: Record<
  AnnouncementSeverity,
  { container: string; icon: typeof Info; iconClass: string }
> = {
  info: {
    container: 'border-sapphire/30 bg-sapphire-muted text-foreground',
    icon: Info,
    iconClass: 'text-sapphire',
  },
  warning: {
    container: 'border-warning/30 bg-warning-muted text-foreground',
    icon: AlertTriangle,
    iconClass: 'text-warning',
  },
  critical: {
    container: 'border-danger/40 bg-danger-muted text-foreground',
    icon: OctagonAlert,
    iconClass: 'text-danger',
  },
  maintenance: {
    container: 'border-violet/30 bg-violet-muted text-foreground',
    icon: Wrench,
    iconClass: 'text-violet',
  },
}

/**
 * Dismissal is keyed by id *and* updatedAt so that editing a live announcement
 * (for example escalating an incident) resurfaces it for people who had already
 * dismissed the earlier wording.
 */
function dismissalKey(announcement: Announcement): string {
  return `${announcement.id}:${announcement.updatedAt}`
}

function readDismissed(): string[] {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(DISMISSED_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : []
  } catch {
    // A corrupt or unavailable store must not break the header.
    return []
  }
}

export function AnnouncementStrip() {
  const announcements = useAnnouncements()
  const [dismissed, setDismissed] = useState<string[]>([])

  // Read after mount so server and client markup agree on the first paint.
  useEffect(() => {
    setDismissed(readDismissed())
  }, [])

  const dismiss = useCallback((announcement: Announcement) => {
    setDismissed((current) => {
      const next = [...new Set([...current, dismissalKey(announcement)])]
      try {
        window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Dismissal is a convenience; failing to persist it is not worth an error.
      }
      return next
    })
  }, [])

  const visible = announcements.filter(
    (announcement) => !announcement.dismissible || !dismissed.includes(dismissalKey(announcement))
  )

  if (visible.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col">
      {visible.map((announcement) => {
        const severity = SEVERITY_STYLES[announcement.severity]
        const Icon = severity.icon

        return (
          <div
            key={announcement.id}
            role="status"
            aria-live={announcement.severity === 'critical' ? 'assertive' : 'polite'}
            className={cn('border-b px-4 py-2.5 sm:px-6', severity.container)}
          >
            <div className="mx-auto flex w-full max-w-7xl items-start gap-3">
              <Icon
                aria-hidden="true"
                className={cn('mt-0.5 size-4 shrink-0', severity.iconClass)}
              />

              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-sm font-medium">{announcement.title}</span>
                {announcement.body ? (
                  <span className="text-sm text-muted-foreground">{announcement.body}</span>
                ) : null}
                {announcement.linkUrl ? (
                  <a
                    href={announcement.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium underline underline-offset-4 hover:opacity-80"
                  >
                    {announcement.linkLabel ?? 'Learn more'}
                  </a>
                ) : null}
              </div>

              {announcement.dismissible ? (
                <button
                  type="button"
                  onClick={() => dismiss(announcement)}
                  aria-label={`Dismiss announcement: ${announcement.title}`}
                  className="-m-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
