import { Activity, Lock, ShieldCheck } from 'lucide-react'

import { HomeCta } from '@/components/home/home-cta'

const TRUST_CHIPS = [
  { icon: Lock, label: 'AES-256-GCM envelope encryption' },
  { icon: ShieldCheck, label: 'Server-enforced RBAC' },
  { icon: Activity, label: 'Full audit trail' },
]

/**
 * The lede leads with the differentiator — apps never receive the real key —
 * rather than with generic "secrets management", which every competitor claims.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute right-[8%] top-[30%] h-[280px] w-[280px] rounded-full bg-sapphire/8 blur-[90px]" />
        <div className="absolute left-[6%] top-[45%] h-[240px] w-[240px] rounded-full bg-violet/8 blur-[90px]" />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-16 pt-16 sm:px-10 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-muted px-3 py-1 text-xs font-medium text-accent-strong">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Built for AI-assisted development
          </span>

          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Your API keys never reach your code
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            PentaVault proxies the request instead of handing over the secret. Your app gets a
            short-lived <code className="font-mono text-accent-strong">pv_tok_</code> credential;
            the real key stays encrypted and never leaves the vault — so a leaked token is scoped,
            expiring, and revocable.
          </p>

          <HomeCta className="mt-8" variant="hero" />

          <p className="mt-4 text-xs text-muted-foreground">
            Free for up to 3 members. No credit card required.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {TRUST_CHIPS.map((chip) => {
              const Icon = chip.icon
              return (
                <span
                  className="inline-flex items-center gap-2 text-xs text-muted-foreground"
                  key={chip.label}
                >
                  <Icon className="h-3.5 w-3.5 text-accent" />
                  {chip.label}
                </span>
              )
            })}
          </div>
        </div>

        <div className="mt-16">
          <div className="mx-auto max-w-5xl">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
              <BrowserChrome />
              <DashboardMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function BrowserChrome() {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-card-elevated/80 px-4 py-3">
      <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
      <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
      <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      <div className="ml-4 flex h-6 flex-1 items-center rounded-md bg-card/70 px-3 text-[11px] font-mono text-muted-foreground">
        app.pentavault.dev/projects/checkout-api/secrets
      </div>
    </div>
  )
}

function DashboardMockup() {
  const secrets = [
    { name: 'STRIPE_SECRET_KEY', env: 'production', mode: 'proxy', calls: '12.4k' },
    { name: 'OPENAI_API_KEY', env: 'production', mode: 'proxy', calls: '48.1k' },
    { name: 'DATABASE_URL', env: 'staging', mode: 'compat', calls: '—' },
    { name: 'SUPABASE_SERVICE_ROLE', env: 'development', mode: 'compat', calls: '—' },
  ]

  return (
    <div className="grid grid-cols-[180px_1fr] bg-background-deep text-foreground">
      <div className="hidden flex-col gap-1 border-r border-border p-4 sm:flex">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-xs font-bold text-accent">
            P
          </span>
          <span className="text-sm font-semibold">PentaVault</span>
        </div>
        {['Dashboard', 'Projects', 'Activity', 'Change Requests'].map((item, index) => (
          <div
            className={`rounded-md px-2.5 py-1.5 text-xs ${
              index === 1 ? 'bg-card-elevated text-foreground' : 'text-muted-foreground'
            }`}
            key={item}
          >
            {item}
          </div>
        ))}
      </div>

      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">checkout-api</p>
            <p className="text-[11px] text-muted-foreground">4 secrets · 3 environments</p>
          </div>
          <span className="rounded-md bg-accent/15 px-2.5 py-1 text-[11px] font-medium text-accent">
            + Add secret
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-border bg-card-elevated/50 px-3.5 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <span>Name</span>
            <span>Env</span>
            <span>Mode</span>
            <span className="text-right">30d calls</span>
          </div>
          {secrets.map((secret, index) => (
            <div
              className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3.5 py-2.5 text-xs ${
                index % 2 === 0 ? 'bg-card/40' : ''
              }`}
              key={secret.name}
            >
              <span className="font-mono text-muted-foreground">{secret.name}</span>
              <span className="rounded bg-card-elevated px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {secret.env}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] ${
                  secret.mode === 'proxy'
                    ? 'bg-accent/15 text-accent'
                    : 'bg-warning-muted text-warning'
                }`}
              >
                {secret.mode === 'proxy' ? 'proxied' : 'direct'}
              </span>
              <span className="text-right font-mono text-[10px] text-muted-foreground">
                {secret.calls}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
