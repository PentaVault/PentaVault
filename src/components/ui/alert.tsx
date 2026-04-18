import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

type AlertProps = HTMLAttributes<HTMLDivElement>

export function Alert({ className, ...props }: AlertProps) {
  return (
    <div
      className={cn('rounded-xl border border-border bg-card px-4 py-3', className)}
      {...props}
    />
  )
}

export function AlertTitle({ className, ...props }: AlertProps) {
  return <div className={cn('font-medium', className)} {...props} />
}

export function AlertDescription({ className, ...props }: AlertProps) {
  return <div className={cn('text-sm text-muted-foreground', className)} {...props} />
}
