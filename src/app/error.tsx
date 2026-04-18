'use client'

type GlobalErrorPageProps = {
  reset: () => void
}

export default function GlobalErrorPage({ reset }: GlobalErrorPageProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
      <div className="space-y-4 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Unexpected error
        </p>
        <h1 className="text-3xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground">
          A global error boundary is wired in. Feature-specific recovery flows will be added later.
        </p>
        <button
          className="inline-flex rounded-lg border border-border px-4 py-2 text-sm"
          onClick={() => reset()}
          type="button"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
