import { Check } from 'lucide-react'
import Link from 'next/link'

import { PLANS } from '@/lib/billing/plans'
import { REGISTER_PATH } from '@/lib/constants'

function formatPrice(priceMonthly: number | null): string {
  if (priceMonthly === null) {
    return 'Custom'
  }
  if (priceMonthly === 0) {
    return '$0'
  }
  return `$${priceMonthly}`
}

export function Pricing() {
  return (
    <section className="border-t border-border bg-background py-20" id="pricing">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Simple, member-based pricing
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start free. Upgrade when your team needs governance and scale.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              className={`relative flex flex-col rounded-2xl border bg-card p-7 ${
                plan.highlighted
                  ? 'border-accent shadow-[0_25px_60px_-30px_rgba(0,0,0,0.6)]'
                  : 'border-border'
              }`}
              key={plan.id}
            >
              {plan.highlighted ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent-strong px-3 py-1 text-xs font-medium text-background">
                  Most popular
                </span>
              ) : null}

              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <p className="mt-1 min-h-10 text-sm text-muted-foreground">{plan.tagline}</p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-tight text-foreground">
                  {formatPrice(plan.priceMonthly)}
                </span>
                <span className="text-sm text-muted-foreground">{plan.priceUnit}</span>
              </div>

              <Link
                className={`mt-6 inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium transition-colors ${
                  plan.highlighted
                    ? 'bg-accent-strong text-background hover:bg-accent'
                    : 'border border-border text-foreground hover:border-border-strong hover:text-accent'
                }`}
                href={REGISTER_PATH}
              >
                {plan.priceMonthly === 0 ? 'Get started' : `Start with ${plan.name}`}
              </Link>

              <ul className="mt-7 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    className="flex items-start gap-2.5 text-sm text-muted-foreground"
                    key={feature}
                  >
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Need self-hosting or an enterprise plan?{' '}
          <Link className="font-medium text-accent hover:text-accent-strong" href={REGISTER_PATH}>
            Talk to us
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
