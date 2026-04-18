import Link from 'next/link'

import { DASHBOARD_HOME_PATH } from '@/lib/constants'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
      <div className="space-y-4 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">404</p>
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground">
          The requested route does not exist in the current frontend scaffold.
        </p>
        <Link
          className="inline-flex rounded-lg border border-border px-4 py-2 text-sm"
          href={DASHBOARD_HOME_PATH}
        >
          Back to dashboard placeholder
        </Link>
      </div>
    </main>
  )
}
