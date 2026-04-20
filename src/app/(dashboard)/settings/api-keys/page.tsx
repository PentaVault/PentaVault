import { ApiKeyCreateForm } from '@/components/dashboard/api-key-create-form'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ApiKeysPage() {
  return (
    <PageWrapper>
      <Card>
        <CardHeader>
          <CardTitle>Fallback API keys</CardTitle>
          <CardDescription>
            Create fallback API keys for CLI exchange flows. Copy-once handling is enforced.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyCreateForm />
        </CardContent>
      </Card>

      <Card className="mt-6 border-warning/35 bg-warning-muted">
        <CardHeader>
          <CardTitle>Security note</CardTitle>
          <CardDescription>
            Treat fallback API keys as sensitive credentials. Store in a password manager and avoid
            plaintext sharing.
          </CardDescription>
        </CardHeader>
      </Card>
    </PageWrapper>
  )
}
