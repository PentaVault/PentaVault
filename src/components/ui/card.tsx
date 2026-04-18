import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl border border-border bg-card shadow-sm', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: CardProps) {
  return <div className={cn('space-y-1.5 px-6 py-5', className)} {...props} />
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={cn('px-6 pb-6', className)} {...props} />
}

export function CardFooter({ className, ...props }: CardProps) {
  return <div className={cn('flex items-center px-6 pb-6', className)} {...props} />
}

export function CardTitle({ className, ...props }: CardProps) {
  return <div className={cn('text-lg font-semibold tracking-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }: CardProps) {
  return <div className={cn('text-sm text-muted-foreground', className)} {...props} />
}
