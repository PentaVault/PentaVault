import { redirect } from 'next/navigation'

import { SETTINGS_ORGANIZATION_PATH } from '@/lib/constants'

export default function SettingsPage(): never {
  redirect(SETTINGS_ORGANIZATION_PATH)
}
