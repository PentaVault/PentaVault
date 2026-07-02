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
    <section className="border-t border-slate-200 bg-slate-50 py-20" id="pricing">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Simple, member-based pricing
          </h2>
          <p className="mt-4 text-slate-600">
            Start free. Upgrade when your team needs governance and scale.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              className={`relative flex flex-col rounded-2xl border bg-white p-7 ${
                plan.highlighted
                  ? 'border-emerald-300 shadow-[0_25px_60px_-30px_rgba(16,185,129,0.55)]'
                  : 'border-slate-200'
              }`}
              key={plan.id}
            >
              {plan.highlighted ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white">
                  Most popular
                </span>
              ) : null}

              <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
              <p className="mt-1 min-h-10 text-sm text-slate-600">{plan.tagline}</p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-tight text-slate-900">
                  {formatPrice(plan.priceMonthly)}
                </span>
                <span className="text-sm text-slate-500">{plan.priceUnit}</span>
              </div>

              <Link
                className={`mt-6 inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium transition-colors ${
                  plan.highlighted
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'border border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900'
                }`}
                href={REGISTER_PATH}
              >
                {plan.priceMonthly === 0 ? 'Get started' : `Start with ${plan.name}`}
              </Link>

              <ul className="mt-7 space-y-3">
                {plan.features.map((feature) => (
                  <li className="flex items-start gap-2.5 text-sm text-slate-600" key={feature}>
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          Need self-hosting or an enterprise plan?{' '}
          <Link
            className="font-medium text-emerald-600 hover:text-emerald-700"
            href={REGISTER_PATH}
          >
            Talk to us
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
