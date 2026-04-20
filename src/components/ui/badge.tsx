import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

type BadgeProps = HTMLAttributes<HTMLDivElement>

export function Badge({ className, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border border-border bg-background-elevated px-2.5 py-1 text-xs font-mono tracking-[0.12em] uppercase text-foreground',
        className
      )}
      {...props}
    />
  )
}

export function StatusBadge({
  tone,
  className,
  ...props
}: BadgeProps & { tone: 'success' | 'warning' | 'danger' | 'neutral' }) {
  const toneClass =
    tone === 'success'
      ? 'border-accent/45 bg-accent/12 text-accent'
      : tone === 'warning'
        ? 'border-warning/45 bg-warning-muted text-warning'
        : tone === 'danger'
          ? 'border-danger/45 bg-danger-muted text-danger'
          : 'border-border bg-background-elevated text-foreground-soft'

  return <Badge className={cn(toneClass, className)} {...props} />
}
