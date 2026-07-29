'use client'

import { Activity } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useInstanceStats } from '@/lib/hooks/use-platform'
import type { InstanceStats } from '@/lib/types/api'

const METRICS: Array<{ key: keyof Omit<InstanceStats, 'collectedAt'>; label: string }> = [
  { key: 'organizations', label: 'Organisations' },
  { key: 'users', label: 'Users' },
  { key: 'activeProjects', label: 'Active projects' },
  { key: 'secrets', label: 'Secrets' },
  { key: 'machineIdentities', label: 'Machine identities' },
  { key: 'activeProxyTokens', label: 'Live proxy tokens' },
]

const numberFormatter = new Intl.NumberFormat()

export function PlatformInstanceStats() {
  const { data, isPending, isError } = useInstanceStats()
  const stats = data?.stats ?? null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Instance
        </CardTitle>
        <CardDescription>
          Totals across every organisation on this instance. Counts are cached for a minute.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isPending ? (
          <p className="py-2 text-sm text-muted-foreground">Loading instance statistics...</p>
        ) : isError || !stats ? (
          <p className="py-2 text-sm text-muted-foreground">Instance statistics are unavailable.</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {METRICS.map((metric) => (
                <div key={metric.key}>
                  <dt className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
                    {metric.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums">
                    {numberFormatter.format(stats[metric.key])}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Collected {new Date(stats.collectedAt).toLocaleString()}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
