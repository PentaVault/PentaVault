import Link from 'next/link'

import { APP_DESCRIPTION, APP_NAME, DASHBOARD_HOME_PATH, LOGIN_PATH } from '@/lib/constants'

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
      <div className="max-w-3xl space-y-6">
        <span className="inline-flex rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
          Frontend foundation initialized
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{APP_NAME}</h1>
        <p className="text-lg leading-8 text-muted-foreground">{APP_DESCRIPTION}</p>
        <p className="text-sm leading-7 text-muted-foreground">
          This phase sets up security guardrails, project structure, typed API foundations, and
          verification tooling. Product features will be added in later prompts.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
            href={LOGIN_PATH}
          >
            Go to login placeholder
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium"
            href={DASHBOARD_HOME_PATH}
          >
            Go to dashboard placeholder
          </Link>
        </div>
      </div>
    </main>
  )
}
