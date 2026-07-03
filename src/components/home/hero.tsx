import { HomeCta } from '@/components/home/home-cta'

/**
 * Browser-framed product shot. The frame renders flat and static — the mockup
 * inside mirrors the dark product UI, which reads as a crisp inset against the
 * light marketing surface.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute right-[8%] top-[30%] h-[280px] w-[280px] rounded-full bg-accent/8 blur-[90px]" />
        <div className="absolute left-[6%] top-[45%] h-[240px] w-[240px] rounded-full bg-accent/8 blur-[90px]" />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-16 pt-16 sm:px-10 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Ship secrets safely, without pasting them into your code
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            PentaVault stores your secrets encrypted, hands your apps short-lived proxy tokens
            instead of raw keys, and records every access with project-scoped roles, approvals, and
            a full audit trail.
          </p>
          <HomeCta className="mt-8" variant="hero" />
          <p className="mt-4 text-xs text-muted-foreground">
            Free for up to 3 members. No credit card required.
          </p>
        </div>

        {/* Browser-framed product shot */}
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
    { name: 'STRIPE_SECRET_KEY', env: 'production', mode: 'proxy' },
    { name: 'OPENAI_API_KEY', env: 'production', mode: 'proxy' },
    { name: 'DATABASE_URL', env: 'staging', mode: 'compat' },
    { name: 'SUPABASE_SERVICE_ROLE', env: 'development', mode: 'compat' },
  ]

  return (
    <div className="grid grid-cols-[180px_1fr] bg-background-deep text-foreground">
      {/* sidebar */}
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

      {/* main */}
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
          {secrets.map((secret, index) => (
            <div
              className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3.5 py-2.5 text-xs ${
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
                    : 'bg-amber-500/15 text-amber-400'
                }`}
              >
                {secret.mode === 'proxy' ? 'proxied' : 'direct'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
