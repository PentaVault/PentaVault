import { ArrowRight, KeyRound, Server, Vault } from 'lucide-react'
import type { ComponentType } from 'react'

type Step = {
  icon: ComponentType<{ className?: string }>
  step: string
  title: string
  description: string
  accent: string
}

const STEPS: Step[] = [
  {
    icon: Vault,
    step: '01',
    title: 'Store the real key once',
    description:
      'Add STRIPE_SECRET_KEY to a project. It is sealed with AES-256-GCM under a wrapped data key and never rendered in full again.',
    accent: 'text-accent bg-accent-muted border-accent/30',
  },
  {
    icon: KeyRound,
    step: '02',
    title: 'Issue a scoped proxy token',
    description:
      'Your app receives a pv_tok_ credential bound to one environment, provider, and optionally a device or IP — with an expiry you choose.',
    accent: 'text-sapphire bg-sapphire-muted border-sapphire/30',
  },
  {
    icon: Server,
    step: '03',
    title: 'PentaVault makes the call',
    description:
      'Requests go to the gateway with the proxy token. PentaVault swaps in the real key upstream, enforces rate limits, and logs the access.',
    accent: 'text-violet bg-violet-muted border-violet/30',
  },
]

/**
 * The proxy-token flow is the product's whole thesis, so it gets a dedicated
 * section rather than being implied by a feature card.
 */
export function HowItWorks() {
  return (
    <section className="border-t border-border bg-background-deep py-20" id="how-it-works">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            The key never leaves the vault
          </h2>
          <p className="mt-4 text-muted-foreground">
            Most secret managers hand your application the credential and hope it stays put.
            PentaVault keeps it and makes the call for you.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 lg:grid-cols-3">
          {STEPS.map((item, index) => {
            const Icon = item.icon
            return (
              <li className="relative" key={item.step}>
                <div className="h-full rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border ${item.accent}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{item.step}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>

                {index < STEPS.length - 1 ? (
                  <ArrowRight
                    aria-hidden="true"
                    className="absolute -right-4 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-border-strong lg:block"
                  />
                ) : null}
              </li>
            )
          })}
        </ol>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground">
          Leak a proxy token and it is scoped, expiring, and revocable in one click. Leak a raw API
          key and you are rotating it everywhere it was ever deployed.
        </p>
      </div>
    </section>
  )
}
