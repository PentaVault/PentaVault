import type { ReactNode } from 'react'

type DashboardLayoutProps = {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 text-sm text-muted-foreground">
          Dashboard shell placeholder
        </div>
      </div>
      {children}
    </div>
  )
}
