import Link from 'next/link'

import { APP_NAME } from '@/lib/constants'

const FOOTER_LINKS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/home#features' },
      { label: 'Pricing', href: '/home#pricing' },
      { label: 'Sign in', href: '/login' },
    ],
  },
  {
    heading: 'Developers',
    links: [
      { label: 'CLI', href: '/home#features' },
      { label: 'Get started', href: '/register' },
    ],
  },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-6 py-14 sm:px-10">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-bold text-background">
                P
              </span>
              <span className="text-base font-semibold text-foreground">{APP_NAME}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Runtime secrets, proxied and audited. Store keys once, hand out short-lived tokens.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            {FOOTER_LINKS.map((column) => (
              <div key={column.heading}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {column.heading}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border-subtle pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {year} {APP_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  )
}
