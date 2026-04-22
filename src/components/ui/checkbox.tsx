'use client'

import type { InputHTMLAttributes } from 'react'

import { Check } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function Checkbox({ checked, className, onCheckedChange, ...props }: CheckboxProps) {
  return (
    <label
      className={cn('relative inline-flex h-4 w-4 shrink-0 items-center justify-center', className)}
    >
      <input
        checked={checked}
        className="peer sr-only"
        onChange={(event) => onCheckedChange(event.target.checked)}
        type="checkbox"
        {...props}
      />
      <span className="flex h-4 w-4 items-center justify-center rounded border border-border bg-background-elevated transition-colors peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring" />
      <Check className="pointer-events-none absolute h-3 w-3 text-background opacity-0 transition-opacity peer-checked:opacity-100" />
    </label>
  )
}
