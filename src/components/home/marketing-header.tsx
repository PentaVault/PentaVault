'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { HomeCta } from '@/components/home/home-cta'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils/cn'

const NAV_LINKS = [
  { label: 'Features', href: '/home#features' },
  { label: 'Pricing', href: '/home#pricing' },
]

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-shadow duration-200',
        // Always keep a solid, readable bar; deepen the shadow once scrolled.
        'border-border bg-background/90 backdrop-blur',
        scrolled && 'shadow-sm'
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-10">
        <Link className="flex items-center gap-2" href="/home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-foreground to-muted-foreground text-sm font-bold text-background shadow-sm">
            P
          </span>
          <span className="text-base font-semibold text-foreground">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-accent"
              href={link.href}
              key={link.label}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <HomeCta variant="header" />
      </div>
    </header>
  )
}
