import { redirect } from 'next/navigation'
import { SETTINGS_ACCOUNT_TOKENS_PATH } from '@/lib/constants'

export default function OrgSettingsApiKeysPage() {
  redirect(SETTINGS_ACCOUNT_TOKENS_PATH)
}
