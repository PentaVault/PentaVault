'use client'

type GlobalErrorPageProps = {
  reset: () => void
}

export default function GlobalErrorPage({ reset }: GlobalErrorPageProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
      <div className="space-y-4 text-center">
        <p className="text-sm font-mono uppercase tracking-[0.12em] text-muted-foreground">
          Unexpected error
        </p>
        <h1 className="text-4xl leading-[1.08] tracking-tight">Something went wrong</h1>
        <p className="text-muted-foreground">
          A global error boundary is wired in. Feature-specific recovery flows will be added later.
        </p>
        <button
          className="inline-flex h-9 items-center rounded-md border border-border bg-background-deep px-8 py-2 text-sm font-medium text-foreground/90 transition-colors hover:border-border-strong hover:text-foreground"
          onClick={() => reset()}
          type="button"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
