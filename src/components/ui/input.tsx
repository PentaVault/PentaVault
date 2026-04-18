import type { InputHTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-foreground/30',
        className
      )}
      {...props}
    />
  )
}
