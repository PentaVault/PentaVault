import { PageWrapper } from '@/components/layout/page-wrapper'
import { StatusBadge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function BillingPage() {
  return (
    <PageWrapper>
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>
            Billing integration is planned after core security workflows are complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <StatusBadge tone="warning" className="mb-2">
            Planned
          </StatusBadge>
          Current phase focuses on projects, secrets, tokens, team, audit, and security operations.
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
