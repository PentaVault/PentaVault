import Link from 'next/link'

import { APP_DESCRIPTION, APP_NAME, DASHBOARD_HOME_PATH, LOGIN_PATH } from '@/lib/constants'

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16 sm:px-10">
      <div className="max-w-5xl space-y-8 rounded-2xl border border-border bg-card p-8 sm:p-10">
        <span className="inline-flex rounded-md border border-accent/30 px-3 py-1 text-xs font-mono tracking-[0.12em] uppercase text-muted-foreground">
          Runtime Secrets Proxy
        </span>
        <h1 className="max-w-4xl text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
          {APP_NAME}
        </h1>
        <p className="max-w-3xl text-base leading-7 text-foreground-soft sm:text-lg sm:leading-8">
          {APP_DESCRIPTION}
        </p>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          Secure project-scoped secret workflows, token operations, team controls, and audit
          visibility. Authentication UX implementation is underway with Better Auth compatibility
          preserved.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border border-foreground bg-background-deep px-8 py-2 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
            href={LOGIN_PATH}
          >
            Go to sign in
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background-deep px-8 py-2 text-sm font-medium text-foreground/90 transition-colors hover:border-border-strong hover:text-foreground"
            href={DASHBOARD_HOME_PATH}
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
