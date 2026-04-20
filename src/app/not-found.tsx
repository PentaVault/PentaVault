import Link from 'next/link'

import { DASHBOARD_HOME_PATH } from '@/lib/constants'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
      <div className="space-y-4 text-center">
        <p className="text-sm font-mono uppercase tracking-[0.12em] text-muted-foreground">404</p>
        <h1 className="text-4xl leading-[1.08] tracking-tight">Page not found</h1>
        <p className="text-muted-foreground">
          The requested route does not exist in the current frontend scaffold.
        </p>
        <Link
          className="inline-flex h-9 items-center rounded-md border border-border bg-background-deep px-8 py-2 text-sm font-medium text-foreground/90 transition-colors hover:border-border-strong hover:text-foreground"
          href={DASHBOARD_HOME_PATH}
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}
