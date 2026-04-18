import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

type SidebarProps = HTMLAttributes<HTMLDivElement>

export function Sidebar({ className, ...props }: SidebarProps) {
  return <aside className={cn('w-full border-r border-border', className)} {...props} />
}
