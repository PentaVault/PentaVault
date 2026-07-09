'use client'

import { motion, useReducedMotion } from 'motion/react'
import Image from 'next/image'

import { cn } from '@/lib/utils/cn'

const BRAND_MARK_EASE = [0.16, 1, 0.3, 1] as const

type BrandMarkProps = {
  className?: string
  /** Pixel size of the square mark. Defaults to 24. */
  size?: number
  /**
   * When false the mark renders with no entrance animation (use inside
   * already-animated containers, dense lists, or when reduced motion is on).
   */
  animate?: boolean
}

/**
 * The PentaVault brand mark renders the app's SVG logo (public/logo.svg,
 * sourced from src/app/icon.svg). Keeps a subtle scale/fade entrance for polish,
 * disabled under prefers-reduced-motion. Decorative: the wordmark text beside it
 * carries the accessible name, so this is aria-hidden.
 */
export function BrandMark({ className, size = 24, animate = true }: BrandMarkProps) {
  const reduceMotion = useReducedMotion()
  const shouldAnimate = animate && !reduceMotion
  const animationProps = shouldAnimate
    ? {
        animate: { opacity: 1, scale: 1 },
        initial: { opacity: 0, scale: 0.8 },
        transition: { duration: 0.4, ease: BRAND_MARK_EASE },
      }
    : {
        initial: false as const,
      }

  return (
    <motion.span
      aria-hidden
      className={cn('block shrink-0', className)}
      style={{ width: size, height: size }}
      {...animationProps}
    >
      <Image
        alt=""
        aria-hidden
        className="h-full w-full"
        draggable={false}
        height={size}
        src="/logo.svg"
        unoptimized
        width={size}
      />
    </motion.span>
  )
}
