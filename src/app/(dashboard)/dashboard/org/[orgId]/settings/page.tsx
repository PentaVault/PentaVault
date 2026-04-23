import { redirect } from 'next/navigation'

import { SETTINGS_ORGANIZATION_PATH } from '@/lib/constants'

export default function OrgSettingsPage(): never {
  redirect(SETTINGS_ORGANIZATION_PATH)
}
