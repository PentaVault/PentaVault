import type { ReactNode } from 'react'

import { cn } from '@/lib/utils/cn'

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <section
      className={cn(
        'w-full rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-sm',
        className
      )}
    >
      <div className="mx-auto max-w-2xl space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm leading-7 text-muted-foreground">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </section>
  )
}
