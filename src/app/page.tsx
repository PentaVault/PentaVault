import { redirect } from 'next/navigation'

import { readServerSession } from '@/lib/auth/server-session'
import { DASHBOARD_HOME_PATH, HOME_PATH } from '@/lib/constants'

export default async function RootPage() {
  const session = await readServerSession()

  if (session?.user?.id) {
    redirect(DASHBOARD_HOME_PATH)
  }

  redirect(HOME_PATH)
}
