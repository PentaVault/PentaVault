import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

type HeaderProps = HTMLAttributes<HTMLElement>

export function Header({ className, ...props }: HeaderProps) {
  return <header className={cn('border-b border-border', className)} {...props} />
}
