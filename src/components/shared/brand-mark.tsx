'use client'

import { motion, useReducedMotion } from 'motion/react'

import { cn } from '@/lib/utils/cn'

type BrandMarkProps = {
  className?: string
  /** Pixel size of the square mark. Defaults to 24. */
  size?: number
  /**
   * When false the mark renders in its final state with no entrance animation
   * (use inside already-animated containers or dense lists).
   */
  animate?: boolean
}

// A pentagon "vault" mark — five sides for "Penta", a keyhole dot for "Vault".
// The pentagon path is a unit shape scaled into a 24x24 viewBox.
const PENTAGON = 'M12 2.5 L20.9 9 L17.5 19.5 L6.5 19.5 L3.1 9 Z'

/**
 * Animated brand mark. The outline draws itself in on mount and the center
 * keyhole fades/scales up just after, using the `motion` library. Falls back to
 * a static mark when the user prefers reduced motion.
 */
export function BrandMark({ className, size = 24, animate = true }: BrandMarkProps) {
  const reduceMotion = useReducedMotion()
  const shouldAnimate = animate && !reduceMotion

  return (
    <svg
      aria-hidden
      className={cn('text-accent', className)}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>PentaVault</title>
      {/* initial={false} makes motion render directly at the animate target
          with no entrance transition — the reduced-motion / static path. */}
      <motion.path
        animate={{ pathLength: 1, opacity: 1 }}
        d={PENTAGON}
        initial={shouldAnimate ? { pathLength: 0, opacity: 0 } : false}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth={1.6}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.circle
        animate={{ scale: 1, opacity: 1 }}
        cx={12}
        cy={12}
        fill="currentColor"
        initial={shouldAnimate ? { scale: 0, opacity: 0 } : false}
        r={2.4}
        style={{ transformOrigin: 'center' }}
        transition={{ delay: 0.6, duration: 0.4, ease: 'easeOut' }}
      />
    </svg>
  )
}
