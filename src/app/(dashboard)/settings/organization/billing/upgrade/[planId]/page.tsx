import { redirect } from 'next/navigation'

import { SETTINGS_ORGANIZATION_BILLING_PLANS_PATH } from '@/lib/constants'

export default function BillingUpgradePage(): never {
  redirect(SETTINGS_ORGANIZATION_BILLING_PLANS_PATH)
}
