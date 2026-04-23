import { type InputHTMLAttributes, forwardRef } from 'react'

import { cn } from '@/lib/utils/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-background-elevated px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring',
        className
      )}
      {...props}
    />
  )
})
