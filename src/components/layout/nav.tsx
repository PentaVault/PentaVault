import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

type NavProps = HTMLAttributes<HTMLElement>

export function Nav({ className, ...props }: NavProps) {
  return <nav className={cn('flex items-center gap-2', className)} {...props} />
}
