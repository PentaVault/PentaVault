'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils/cn'

type BottomActionBarProps = {
  /** When false, the bar animates out and stops receiving pointer events. */
  visible?: boolean
  /**
   * `center` floats a pill in the middle of the content column (bulk actions);
   * `right` pins to the right edge of the max-width column (persistent launchers).
   */
  align?: 'center' | 'right'
  children: ReactNode
  className?: string
}

/**
 * A fixed, bottom-floating action bar shared by the projects page's bulk-select
 * actions and its archived-projects launcher. Positioning lives on the outer
 * element; the enter/exit transform lives on the inner element so the static
 * centering transform never conflicts with the animated slide-in.
 */
export function BottomActionBar({
  visible = true,
  align = 'center',
  children,
  className,
}: BottomActionBarProps) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed bottom-6 z-20',
        align === 'center' && '-translate-x-1/2 left-1/2'
      )}
      style={
        align === 'right'
          ? { right: 'max(1.5rem, calc((100vw - var(--app-max-width)) / 2 + 1.5rem))' }
          : undefined
      }
    >
      <div
        aria-hidden={!visible}
        className={cn(
          'transition-all duration-200 ease-out motion-reduce:transition-none',
          visible ? 'pointer-events-auto translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
