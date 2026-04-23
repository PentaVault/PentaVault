'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/hooks/use-auth'

function SettingRow({
  children,
  description,
  title,
}: {
  children: React.ReactNode
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

export default function OrgAccessControlPage() {
  const { activeOrganization } = useAuth()
  const org = activeOrganization?.organization
  const defaultVisibility = org?.defaultProjectVisibility === 'open' ? 'open' : 'private'
  const showNames = org?.privateProjectDiscoverability !== 'hidden'

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold">Access control</h2>
        <p className="text-sm text-muted-foreground">
          Control how members access projects and secrets in this organisation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project access defaults</CardTitle>
          <CardDescription>
            These settings shape how new projects and access requests behave.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingRow
            description="New projects are private by default unless the organisation is configured for open discovery."
            title="Default project visibility"
          >
            <span className="rounded-md border border-border bg-card-elevated px-3 py-1.5 text-sm capitalize">
              {defaultVisibility}
            </span>
          </SettingRow>

          <SettingRow
            description="When enabled, members can discover private project names and request access."
            title="Show private projects to members"
          >
            <span className="rounded-md border border-border bg-card-elevated px-3 py-1.5 text-sm">
              {showNames ? 'Enabled' : 'Disabled'}
            </span>
          </SettingRow>

          <SettingRow
            description="Members request access to private projects; owners and admins review those requests."
            title="Require approval for project access"
          >
            <span className="rounded-md border border-border bg-card-elevated px-3 py-1.5 text-sm">
              Enabled
            </span>
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  )
}
