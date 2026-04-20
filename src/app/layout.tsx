import type { Metadata } from 'next'
import { Manrope, Source_Code_Pro } from 'next/font/google'
import type { ReactNode } from 'react'

import { APP_DESCRIPTION, APP_NAME } from '@/lib/constants'
import { AppProviders } from '@/providers'
import '@/styles/globals.css'

const brandSans = Manrope({
  variable: '--font-brand-sans',
  subsets: ['latin'],
})

const brandMono = Source_Code_Pro({
  variable: '--font-brand-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
}

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`${brandSans.variable} ${brandMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
