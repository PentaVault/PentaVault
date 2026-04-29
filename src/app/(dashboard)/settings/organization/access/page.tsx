'use client'

import { useRouter } from 'next/navigation'
import { type ReactNode, useEffect } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch, SwitchThumb } from '@/components/ui/switch'
import { organizationsApi } from '@/lib/api/organizations'
import { SETTINGS_ORGANIZATION_MEMBERS_PATH } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

function SettingRow({
  children,
  description,
  title,
}: {
  children: ReactNode
  description: string
  title: string
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function AccessSwitch({
  checked,
  disabled,
  onCheckedChange,
}: {
  checked: boolean
  disabled: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Switch
      checked={checked}
      className="relative h-6 w-11 rounded-full border border-border bg-background-elevated outline-none transition-colors data-[state=checked]:bg-accent/80"
      disabled={disabled}
      onCheckedChange={onCheckedChange}
    >
      <SwitchThumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-foreground transition-transform data-[state=checked]:translate-x-5" />
    </Switch>
  )
}

export default function OrgAccessControlPage() {
  const auth = useAuth()
  const { activeOrganization } = auth
  const router = useRouter()
  const { toast } = useToast()
  const org = activeOrganization?.organization
  const role = activeOrganization?.membership.role
  const canManageAccess = role === 'owner' || role === 'admin'
  const membersCanSeeAllProjects = org?.membersCanSeeAllProjects ?? true
  const membersCanRequestProjectAccess = org?.membersCanRequestProjectAccess ?? true
  const disabled = !org || !canManageAccess

  useEffect(() => {
    if (auth.status !== 'loading' && !canManageAccess) {
      router.replace(SETTINGS_ORGANIZATION_MEMBERS_PATH)
    }
  }, [auth.status, canManageAccess, router])

  if (auth.status !== 'loading' && !canManageAccess) {
    return null
  }

  async function updateAccessControl(
    key: 'membersCanSeeAllProjects' | 'membersCanRequestProjectAccess',
    checked: boolean
  ) {
    if (!org) {
      return
    }

    try {
      await organizationsApi.updateAccessControl(org.id, {
        [key]: checked,
        ...(key === 'membersCanSeeAllProjects' && !checked
          ? { membersCanRequestProjectAccess: false }
          : {}),
      })
      await auth.refresh()
      toast.success('Access control updated.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update access control right now.'))
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold">Access control</h2>
        <p className="text-sm text-muted-foreground">
          Control how members interact with projects in this organisation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project access</CardTitle>
          <CardDescription>
            These organisation-level settings decide what members can discover and request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingRow
            description="When enabled, members can see project names in this organisation even before they are added. Secrets and tokens still require project membership."
            title="Members can see all projects"
          >
            <AccessSwitch
              checked={membersCanSeeAllProjects}
              disabled={disabled}
              onCheckedChange={(checked) =>
                void updateAccessControl('membersCanSeeAllProjects', checked)
              }
            />
          </SettingRow>

          <SettingRow
            description="When enabled, members can send access requests to project owners and admins for projects they can see. Enable project visibility first."
            title="Members can request project access"
          >
            <AccessSwitch
              checked={membersCanSeeAllProjects && membersCanRequestProjectAccess}
              disabled={disabled || !membersCanSeeAllProjects}
              onCheckedChange={(checked) =>
                void updateAccessControl('membersCanRequestProjectAccess', checked)
              }
            />
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  )
}
