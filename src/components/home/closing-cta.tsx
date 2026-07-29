import { HomeCta } from '@/components/home/home-cta'

export function ClosingCta() {
  return (
    <section className="relative overflow-hidden border-t border-border bg-background-deep py-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[360px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Stop shipping keys you cannot revoke
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
          Set up a project, issue your first proxy token, and route a real call through the gateway
          in a few minutes.
        </p>

        <div className="mt-8 flex justify-center">
          <HomeCta variant="hero" />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Free for up to 3 members. No credit card required.
        </p>
      </div>
    </section>
  )
}
