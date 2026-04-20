import type { PropsWithChildren } from 'react'

import { cn } from '@/lib/utils/cn'

type PageWrapperProps = PropsWithChildren<{
  className?: string
}>

export function PageWrapper({ children, className }: PageWrapperProps) {
  return <div className={cn('w-full px-2 py-8 sm:px-3 lg:px-4', className)}>{children}</div>
}
