'use client'

import { Loader2 } from 'lucide-react'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'

type InlineEditFieldProps = {
  disabled?: boolean
  disabledReason?: string
  isPending?: boolean
  label: string
  onSave: (value: string) => void
  value: string
}

export function InlineEditField({
  disabled = false,
  disabledReason,
  isPending = false,
  label,
  onSave,
  value: initialValue,
}: InlineEditFieldProps) {
  const [value, setValue] = useState(initialValue)
  const fieldId = useId()
  const trimmedValue = value.trim()
  const hasChanges = trimmedValue !== initialValue.trim() && trimmedValue.length > 0

  return (
    <div className="space-y-1.5">
      <label
        className="text-xs font-mono tracking-[0.12em] text-muted-foreground uppercase"
        htmlFor={fieldId}
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Input
          className={cn(
            'min-w-0 flex-1',
            disabled && 'cursor-not-allowed bg-card-elevated opacity-60'
          )}
          disabled={disabled}
          id={fieldId}
          onChange={(event) => setValue(event.target.value)}
          value={value}
        />
        {hasChanges && !disabled ? (
          <Button
            className="h-9 flex-shrink-0 px-3"
            disabled={isPending}
            onClick={() => onSave(trimmedValue)}
            size="sm"
            type="button"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
          </Button>
        ) : null}
      </div>
      {disabled && disabledReason ? (
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      ) : null}
    </div>
  )
}
