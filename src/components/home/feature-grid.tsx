import { Activity, GitPullRequestArrow, KeyRound, Lock, ShieldCheck, Terminal } from 'lucide-react'
import type { ComponentType } from 'react'

type Feature = {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}

const FEATURES: Feature[] = [
  {
    icon: Lock,
    title: 'Envelope encryption',
    description:
      'Secrets are sealed with AES-256-GCM under wrapped data keys. Values are decrypted only when a request is authorised.',
  },
  {
    icon: KeyRound,
    title: 'Proxy tokens, not raw keys',
    description:
      'Hand apps short-lived pv_tok_ credentials bound to an environment, device, IP, or session. Rotate or revoke without redeploying.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    description:
      'Organisation and project roles decide who can read, write, and approve. Every gate is enforced on the server, not just the UI.',
  },
  {
    icon: GitPullRequestArrow,
    title: 'Change requests',
    description:
      'Promote a private branch of config to main through review and approval. Sensitive changes never land unseen.',
  },
  {
    icon: Activity,
    title: 'Audit and alerts',
    description:
      'Every access, grant, and rotation is logged. Security alerts flag new devices, new locations, and probable leaks.',
  },
  {
    icon: Terminal,
    title: 'Fast Rust CLI',
    description:
      'pv pulls secrets, runs commands with them injected, and manages config branches — without printing a token to your shell.',
  },
]

export function FeatureGrid() {
  return (
    <section className="border-t border-border bg-background py-20" id="features">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            A secrets platform, not just a vault
          </h2>
          <p className="mt-4 text-muted-foreground">
            Store, proxy, govern, and audit — the whole lifecycle of a secret in one place.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-accent/60 hover:shadow-[0_20px_50px_-25px_rgba(16,185,129,0.25)]"
                key={feature.title}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent transition-colors group-hover:bg-accent/25">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
