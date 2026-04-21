'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  LOGIN_PATH,
  PROJECTS_PATH,
  SETTINGS_API_KEYS_PATH,
  SETTINGS_PATH,
  SETTINGS_SESSIONS_PATH,
  getOrgDashboardPath,
  getOrgProjectsPath,
  getOrgSettingsApiKeysPath,
  getOrgSettingsPath,
  getOrgSettingsSessionsPath,
} from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

function AvatarGlyph() {
  return (
    <svg aria-hidden="true" className="profile-glyph h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.2" />
      <path
        className="profile-glyph-lines"
        d="M6 8h12M6 12h12M6 16h12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
      <circle
        className="profile-glyph-dot profile-glyph-dot-1"
        cx="8"
        cy="8"
        fill="currentColor"
        r="1.1"
      />
      <circle
        className="profile-glyph-dot profile-glyph-dot-2"
        cx="16"
        cy="12"
        fill="currentColor"
        r="1.1"
      />
      <circle
        className="profile-glyph-dot profile-glyph-dot-3"
        cx="10"
        cy="16"
        fill="currentColor"
        r="1.1"
      />
    </svg>
  )
}

export function ProfileMenu() {
  const router = useRouter()
  const auth = useAuth()
  const { toast } = useToast()

  const userName = auth.session?.user.name ?? 'Unknown user'
  const userEmail = auth.session?.user.email ?? 'No email'
  const activeOrgId = auth.activeOrganization?.organization.id ?? null

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
          className="h-9 w-9 rounded-full p-0"
          variant="outline"
        >
          <Avatar className="h-8 w-8 rounded-full">
            <AvatarFallback className="rounded-full bg-[#171717] text-[#fafafa]">
              <AvatarGlyph />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(18rem,calc(100vw-1rem))] rounded-md"
        collisionPadding={8}
        sideOffset={8}
      >
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium text-foreground">{userName}</p>
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
          <Link href={activeOrgId ? getOrgSettingsPath(activeOrgId) : SETTINGS_PATH}>Settings</Link>
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
            API Keys
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
