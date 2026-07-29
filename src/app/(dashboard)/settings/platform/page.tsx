'use client'

import { ShieldAlert } from 'lucide-react'

import { PlatformAnnouncements } from '@/components/settings/platform-announcements'
import { PlatformFeatureFlags } from '@/components/settings/platform-feature-flags'
import { PlatformInstanceStats } from '@/components/settings/platform-instance-stats'
import { Card, CardContent } from '@/components/ui/card'
import { usePlatformFeatureFlags } from '@/lib/hooks/use-platform'

export default function PlatformSettingsPage() {
  // The API answers 404 for non-operators rather than 403, so a failed probe is
  // the signal to show the not-authorised state instead of an error.
  const { isError, isPending } = usePlatformFeatureFlags()

  if (!isPending && isError) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card>
          <CardContent className="flex items-start gap-3 py-6">
            <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Operator access required</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Platform flags and announcements are managed by instance operators. Ask an operator
                to add your user ID to <code className="font-mono">AUTH_ADMIN_USER_IDS</code>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Platform</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Instance-wide controls. Changes here apply to every organisation without a redeploy.
        </p>
      </div>

      <PlatformInstanceStats />
      <PlatformFeatureFlags />
      <PlatformAnnouncements />
    </div>
  )
}
