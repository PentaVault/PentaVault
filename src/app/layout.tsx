import type { Metadata } from 'next'
import { headers } from 'next/headers'
import type { ReactNode } from 'react'

import { APP_DESCRIPTION, APP_NAME } from '@/lib/constants'
import { env } from '@/lib/env'
import { AppProviders } from '@/providers'
import '@/styles/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: ['/icon.svg'],
    apple: [{ url: '/apple-icon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    url: env.appUrl,
    images: [{ url: '/logo.svg', alt: `${APP_NAME} logo` }],
  },
  twitter: {
    card: 'summary',
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: ['/logo.svg'],
  },
}

type RootLayoutProps = {
  children: ReactNode
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const providerProps = nonce ? { nonce } : {}

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="darkreader-lock" />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased">
        <AppProviders {...providerProps}>{children}</AppProviders>
      </body>
    </html>
  )
}
