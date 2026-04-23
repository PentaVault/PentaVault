'use client'

import type { InputHTMLAttributes, PointerEvent } from 'react'
import { useState } from 'react'

import { Eye } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [isPeeking, setIsPeeking] = useState(false)

  function startPeek(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    setIsPeeking(true)
  }

  function stopPeek() {
    setIsPeeking(false)
  }

  return (
    <div className="relative">
      <Input {...props} className={cn('pr-10', className)} type={isPeeking ? 'text' : 'password'} />
      <button
        aria-label="Hold to show password"
        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
        onBlur={stopPeek}
        onPointerCancel={stopPeek}
        onPointerDown={startPeek}
        onPointerLeave={stopPeek}
        onPointerUp={stopPeek}
        tabIndex={-1}
        type="button"
      >
        <Eye className="h-4 w-4" />
      </button>
    </div>
  )
}
