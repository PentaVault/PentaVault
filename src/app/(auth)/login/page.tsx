import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'

export default function LoginPage() {
  return (
    <PageWrapper className="flex min-h-screen items-center justify-center">
      <EmptyState
        title="Login"
        description="Authentication screens are intentionally deferred to the next implementation prompt."
      />
    </PageWrapper>
  )
}
