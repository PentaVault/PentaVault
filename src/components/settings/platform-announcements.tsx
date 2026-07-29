'use client'

import { Loader2, Megaphone, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  useCreateAnnouncement,
  useDeleteAnnouncement,
  usePlatformAnnouncements,
  useUpdateAnnouncement,
} from '@/lib/hooks/use-platform'
import { useToast } from '@/lib/hooks/use-toast'
import type { Announcement, AnnouncementSeverity } from '@/lib/types/api'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

const SEVERITIES: AnnouncementSeverity[] = ['info', 'warning', 'maintenance', 'critical']

const SEVERITY_STYLES: Record<AnnouncementSeverity, string> = {
  info: 'border-sapphire/40 bg-sapphire-muted text-sapphire',
  warning: 'border-warning/40 bg-warning-muted text-warning',
  maintenance: 'border-violet/40 bg-violet-muted text-violet',
  critical: 'border-danger/40 bg-danger-muted text-danger',
}

function formatWindow(announcement: Announcement): string | null {
  if (!announcement.startsAt && !announcement.endsAt) {
    return null
  }
  const from = announcement.startsAt
    ? new Date(announcement.startsAt).toLocaleString()
    : 'immediately'
  const to = announcement.endsAt ? new Date(announcement.endsAt).toLocaleString() : 'no end'
  return `${from} → ${to}`
}

function AnnouncementRow({ announcement }: { announcement: Announcement }) {
  const { toast } = useToast()
  const updateAnnouncement = useUpdateAnnouncement()
  const deleteAnnouncement = useDeleteAnnouncement()

  async function toggleActive(): Promise<void> {
    try {
      await updateAnnouncement.mutateAsync({
        announcementId: announcement.id,
        input: { active: !announcement.active },
      })
      toast.success(announcement.active ? 'Announcement taken down.' : 'Announcement published.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update this announcement right now.'))
    }
  }

  async function handleDelete(): Promise<void> {
    try {
      await deleteAnnouncement.mutateAsync(announcement.id)
      toast.success('Announcement deleted.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to delete this announcement right now.'))
    }
  }

  const scheduleWindow = formatWindow(announcement)

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{announcement.title}</span>
            <Badge className={cn('border', SEVERITY_STYLES[announcement.severity])}>
              {announcement.severity}
            </Badge>
            <Badge
              className={cn(
                'border',
                announcement.active
                  ? 'border-accent/40 bg-accent-muted text-accent-strong'
                  : 'border-border text-muted-foreground'
              )}
            >
              {announcement.active ? 'Live' : 'Draft'}
            </Badge>
            {announcement.audience !== 'all' ? (
              <Badge className="border border-border text-muted-foreground">
                {announcement.audience}
              </Badge>
            ) : null}
            {!announcement.dismissible ? (
              <Badge className="border border-border text-muted-foreground">Persistent</Badge>
            ) : null}
          </div>

          {announcement.body ? (
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{announcement.body}</p>
          ) : null}
          {scheduleWindow ? (
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{scheduleWindow}</p>
          ) : null}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            disabled={updateAnnouncement.isPending}
            onClick={() => void toggleActive()}
            size="sm"
            type="button"
            variant={announcement.active ? 'outline' : 'default'}
          >
            {announcement.active ? 'Take down' : 'Publish'}
          </Button>
          <Button
            aria-label={`Delete announcement ${announcement.title}`}
            disabled={deleteAnnouncement.isPending}
            onClick={() => void handleDelete()}
            size="sm"
            type="button"
            variant="outline"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function PlatformAnnouncements() {
  const { toast } = useToast()
  const { data, isPending, isError } = usePlatformAnnouncements()
  const createAnnouncement = useCreateAnnouncement()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [severity, setSeverity] = useState<AnnouncementSeverity>('info')

  async function handleCreate(): Promise<void> {
    const normalizedTitle = title.trim()
    if (!normalizedTitle) {
      toast.error('Announcement title is required.')
      return
    }

    try {
      await createAnnouncement.mutateAsync({
        title: normalizedTitle,
        body: body.trim() || null,
        severity,
      })
      setTitle('')
      setBody('')
      setSeverity('info')
      toast.success('Announcement published.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to publish this announcement right now.'))
    }
  }

  const announcements = data?.announcements ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-muted-foreground" />
          Announcements
        </CardTitle>
        <CardDescription>
          Shown as a strip beneath the header. Publishing is live within about 15 seconds — use this
          for incidents and maintenance windows.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-3 border-b border-border pb-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[240px] flex-1 space-y-1">
              <label
                className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                htmlFor="new-announcement-title"
              >
                Title
              </label>
              <Input
                id="new-announcement-title"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Scheduled maintenance on Sunday"
                value={title}
              />
            </div>

            <div className="space-y-1">
              <span className="block text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
                Severity
              </span>
              <div className="flex gap-1">
                {SEVERITIES.map((option) => (
                  <Button
                    key={option}
                    onClick={() => setSeverity(option)}
                    size="sm"
                    type="button"
                    variant={severity === option ? 'default' : 'outline'}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[240px] flex-1 space-y-1">
              <label
                className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                htmlFor="new-announcement-body"
              >
                Detail (optional)
              </label>
              <Input
                id="new-announcement-body"
                onChange={(event) => setBody(event.target.value)}
                placeholder="Proxy requests may fail intermittently between 02:00 and 04:00 UTC."
                value={body}
              />
            </div>

            <Button
              disabled={createAnnouncement.isPending}
              onClick={() => void handleCreate()}
              size="sm"
              type="button"
            >
              {createAnnouncement.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Publish
            </Button>
          </div>
        </div>

        {isPending ? (
          <p className="py-6 text-sm text-muted-foreground">Loading announcements...</p>
        ) : isError ? (
          <p className="py-6 text-sm text-danger">Unable to load announcements.</p>
        ) : announcements.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No announcements yet. Anything published here appears immediately beneath the header.
          </p>
        ) : (
          <div>
            {announcements.map((announcement) => (
              <AnnouncementRow announcement={announcement} key={announcement.id} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
