'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown'
import { authApi } from '@/lib/api/auth'
import {
  DASHBOARD_HOME_PATH,
  getOrgDashboardPath,
  getOrgProjectsPath,
  getOrgSettingsApiKeysPath,
  getOrgSettingsPath,
  getOrgSettingsSessionsPath,
  LOGIN_PATH,
  PROJECTS_PATH,
  SETTINGS_API_KEYS_PATH,
  SETTINGS_ORGANIZATION_PATH,
  SETTINGS_SESSIONS_PATH,
} from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

export function ProfileMenu() {
  const router = useRouter()
  const auth = useAuth()
  const { toast } = useToast()

  const userName = auth.session?.user.name ?? 'Unknown user'
  const userEmail = auth.session?.user.email ?? 'No email'
  const activeOrgId = auth.activeOrganization?.organization.id ?? null
  // Cosmetic tier badge only — never gate any action on this client value.
  const plan = auth.activeOrganization?.organization.plan
  const tierLabel = plan === 'team' ? 'Team' : plan === 'pro' ? 'Pro' : null

  async function handleLogout(): Promise<void> {
    try {
      await authApi.signOut()
      auth.clear()
      toast.success('Signed out successfully.')
      router.replace(LOGIN_PATH)
      router.refresh()
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to sign out right now.'))
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Open profile menu"
          className="relative h-9 w-9 rounded-full border-border p-0"
          variant="ghost"
        >
          <span className="block h-full w-full overflow-hidden rounded-full bg-[radial-gradient(circle_at_30%_25%,#34d399_0%,#10b981_45%,#0f3d2e_100%)]" />
          {tierLabel ? (
            <span className="absolute -right-1 -bottom-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-background bg-accent px-1 text-[8px] font-bold leading-none text-background uppercase shadow-sm">
              {tierLabel === 'Team' ? 'T' : 'P'}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(18rem,calc(100vw-1rem))] rounded-md"
        collisionPadding={8}
        sideOffset={8}
      >
        <div className="px-2 py-1.5">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{userName}</p>
            {tierLabel ? (
              <span className="shrink-0 rounded-md border border-accent-border bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-accent">
                {tierLabel}
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          asChild
          className="bg-transparent hover:bg-card-elevated focus:bg-card-elevated"
        >
          <Link href={activeOrgId ? getOrgDashboardPath(activeOrgId) : DASHBOARD_HOME_PATH}>
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className="bg-transparent hover:bg-card-elevated focus:bg-card-elevated"
        >
          <Link href={activeOrgId ? getOrgProjectsPath(activeOrgId) : PROJECTS_PATH}>Projects</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className="bg-transparent hover:bg-card-elevated focus:bg-card-elevated"
        >
          <Link href={activeOrgId ? getOrgSettingsPath(activeOrgId) : SETTINGS_ORGANIZATION_PATH}>
            Organisation
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className="bg-transparent hover:bg-card-elevated focus:bg-card-elevated"
        >
          <Link
            href={activeOrgId ? getOrgSettingsSessionsPath(activeOrgId) : SETTINGS_SESSIONS_PATH}
          >
            Sessions
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className="bg-transparent hover:bg-card-elevated focus:bg-card-elevated"
        >
          <Link
            href={activeOrgId ? getOrgSettingsApiKeysPath(activeOrgId) : SETTINGS_API_KEYS_PATH}
          >
            Tokens
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="bg-transparent text-danger hover:bg-danger/10 focus:bg-danger/10"
          onSelect={(event) => {
            event.preventDefault()
            void handleLogout()
          }}
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
