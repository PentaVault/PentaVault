import type { PropsWithChildren } from 'react'

import { cn } from '@/lib/utils/cn'

type PageWrapperProps = PropsWithChildren<{
  className?: string
}>

export function PageWrapper({ children, className }: PageWrapperProps) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 py-10', className)}>{children}</div>
}
