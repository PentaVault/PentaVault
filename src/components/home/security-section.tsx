import { Eye, FileClock, Fingerprint, Network, RotateCcw, ShieldBan } from 'lucide-react'
import type { ComponentType } from 'react'

type Guarantee = {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}

const GUARANTEES: Guarantee[] = [
  {
    icon: ShieldBan,
    title: 'Deny by default',
    description:
      'Unresolved permissions fail closed. Every privileged action is re-checked server-side — UI role gates are treated as cosmetic.',
  },
  {
    icon: Network,
    title: 'SSRF-hardened gateway',
    description:
      'Upstream hosts are canonicalised, loopback and private ranges are blocked, and response size is capped. Webhooks use the same resolver.',
  },
  {
    icon: Fingerprint,
    title: 'Bindable tokens',
    description:
      'Bind a proxy token to a device, IP, or session. A stolen token used from anywhere else is rejected, not merely logged.',
  },
  {
    icon: RotateCcw,
    title: 'Rotation without redeploys',
    description:
      'Rotate the upstream key in the vault and every proxy token keeps working. No coordinated redeploy across services.',
  },
  {
    icon: FileClock,
    title: 'Point-in-time recovery',
    description:
      'Snapshots and per-secret version history mean a bad change is a restore, not an incident post-mortem.',
  },
  {
    icon: Eye,
    title: 'Leak detection',
    description:
      'Signatures flag probable leaks and surface rotation recommendations before a key is exploited.',
  },
]

export function SecuritySection() {
  return (
    <section className="border-t border-border bg-background-deep py-20" id="security">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Built to fail closed
          </h2>
          <p className="mt-4 text-muted-foreground">
            A secrets platform is only as good as its worst edge case. These are the defaults, not
            the upsells.
          </p>
        </div>

        <div className="mt-14 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {GUARANTEES.map((guarantee) => {
            const Icon = guarantee.icon
            return (
              <div className="flex gap-4" key={guarantee.title}>
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-card text-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{guarantee.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    {guarantee.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
