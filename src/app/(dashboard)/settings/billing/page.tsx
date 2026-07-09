import { redirect } from 'next/navigation'

import { SETTINGS_ORGANIZATION_BILLING_PATH } from '@/lib/constants'

export default function BillingPage(): never {
  redirect(SETTINGS_ORGANIZATION_BILLING_PATH)
}
