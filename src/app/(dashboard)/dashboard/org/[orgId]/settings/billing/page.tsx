import { redirect } from 'next/navigation'

import { SETTINGS_ORGANIZATION_BILLING_PATH } from '@/lib/constants'

export default function OrgSettingsBillingPage(): never {
  redirect(SETTINGS_ORGANIZATION_BILLING_PATH)
}
