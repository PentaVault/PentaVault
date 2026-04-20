import type { ReactNode } from 'react'

type AuthLayoutProps = {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-0 lg:grid-cols-[1fr_420px]">
        <section className="hidden border-r border-border p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-5">
            <p className="text-xs font-mono tracking-[0.12em] uppercase text-[#00c573]">
              PentaVault Auth
            </p>
            <h2 className="max-w-md text-5xl leading-[1.02] tracking-tight text-foreground">
              Control runtime secrets without exposing provider keys.
            </h2>
            <p className="max-w-md text-sm leading-7 text-foreground-soft">
              Session-backed authentication for security-sensitive project operations, token
              workflows, and audit visibility.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            This interface is designed for low-friction access while keeping backend security
            boundaries strict.
          </p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-8">
          {children}
        </section>
      </div>
    </div>
  )
}
