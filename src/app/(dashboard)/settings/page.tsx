import Link from 'next/link'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  SETTINGS_API_KEYS_PATH,
  SETTINGS_BILLING_PATH,
  SETTINGS_SESSIONS_PATH,
} from '@/lib/constants'

export default function SettingsPage() {
  return (
    <PageWrapper>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              Manage account, API key fallback flows, and product-level configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href={SETTINGS_API_KEYS_PATH}
              className="block rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-border-strong hover:bg-card-elevated"
            >
              API key management
            </Link>
            <Link
              href={SETTINGS_BILLING_PATH}
              className="block rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-border-strong hover:bg-card-elevated"
            >
              Billing
            </Link>
            <Link
              href={SETTINGS_SESSIONS_PATH}
              className="block rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-border-strong hover:bg-card-elevated"
            >
              Session management
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
