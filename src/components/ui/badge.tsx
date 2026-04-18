import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

type BadgeProps = HTMLAttributes<HTMLDivElement>

export function Badge({ className, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground',
        className
      )}
      {...props}
    />
  )
}
