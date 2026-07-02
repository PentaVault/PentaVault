'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { APP_NAME, LOGIN_PATH, REGISTER_PATH } from '@/lib/constants'
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
        'sticky top-0 z-40 border-b transition-colors duration-200',
        scrolled
          ? 'border-slate-200 bg-white/85 backdrop-blur'
          : 'border-transparent bg-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-10">
        <Link className="flex items-center gap-2" href="/home">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500 text-sm font-bold text-white">
            P
          </span>
          <span className="text-base font-semibold text-slate-900">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              className="rounded-md px-3 py-2 text-sm text-slate-600 transition-colors hover:text-slate-900"
              href={link.href}
              key={link.label}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            className="hidden h-9 items-center rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:inline-flex"
            href={LOGIN_PATH}
          >
            Sign in
          </Link>
          <Link
            className="inline-flex h-9 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            href={REGISTER_PATH}
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}
