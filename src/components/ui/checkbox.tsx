'use client'

import { Check } from 'lucide-react'
import type { InputHTMLAttributes, MouseEventHandler } from 'react'

import { cn } from '@/lib/utils/cn'

type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange' | 'onClick'
> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  // Attached to the label (the real click target), so it is typed for the label.
  onClick?: MouseEventHandler<HTMLLabelElement>
}

export function Checkbox({
  checked,
  className,
  onCheckedChange,
  onClick,
  ...props
}: CheckboxProps) {
  return (
    // onClick is attached to the label (the element the user actually clicks —
    // the input is sr-only) so callers can stopPropagation on the real click
    // target, e.g. to keep a checkbox inside a clickable card from also
    // triggering the card's navigation. No keyboard handler is needed: the
    // interactive control is the nested keyboard-accessible <input>, and this
    // onClick only manages event propagation, it adds no primary interaction.
    // biome-ignore lint/a11y/useKeyWithClickEvents: label onClick only stops propagation; the nested input handles keyboard.
    <label
      className={cn('relative inline-flex h-4 w-4 shrink-0 items-center justify-center', className)}
      onClick={onClick}
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
