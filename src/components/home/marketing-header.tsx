'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { HomeCta } from '@/components/home/home-cta'
import { AnnouncementStrip } from '@/components/layout/announcement-strip'
import { BrandMark } from '@/components/shared/brand-mark'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils/cn'

const NAV_LINKS = [
  { label: 'How it works', href: '/home#how-it-works' },
  { label: 'Developers', href: '/home#developers' },
  { label: 'Security', href: '/home#security' },
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
        <Link className="group flex items-center gap-2" href="/home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/30 bg-accent-muted transition-colors group-hover:border-accent/60">
            <BrandMark size={20} />
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

      <AnnouncementStrip />
    </header>
  )
}
