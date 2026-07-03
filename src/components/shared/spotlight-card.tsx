'use client'

import { type ReactNode, useRef } from 'react'

import { cn } from '@/lib/utils/cn'

type SpotlightCardProps = {
  children: ReactNode
  className?: string
  /** Border glow color. Defaults to the emerald accent; pass a jewel token for section identity. */
  glowColor?: string
  /** Radius of the spotlight in px. */
  radius?: number
}

/**
 * A card whose border lights up in the accent color ONLY where the cursor is —
 * a mouse-following "spotlight border". No transform/lift/pop (the moving
 * effect the design intentionally avoids); just a colorful edge highlight that
 * tracks the pointer. Pure CSS + a pointer handler, no dependency.
 *
 * The glow is a radial gradient painted into the padding ring and masked so it
 * only shows on the border (mask-composite: exclude punches out the interior).
 */
export function SpotlightCard({
  children,
  className,
  glowColor = 'var(--accent)',
  radius = 180,
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--spotlight-x', `${event.clientX - rect.left}px`)
    el.style.setProperty('--spotlight-y', `${event.clientY - rect.top}px`)
    el.style.setProperty('--spotlight-opacity', '1')
  }

  function handlePointerLeave() {
    ref.current?.style.setProperty('--spotlight-opacity', '0')
  }

  return (
    <div
      className={cn('spotlight-card relative rounded-[var(--radius)]', className)}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      ref={ref}
      style={
        {
          '--spotlight-color': glowColor,
          '--spotlight-radius': `${radius}px`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}
