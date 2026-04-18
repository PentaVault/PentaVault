import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'

export default function RegisterPage() {
  return (
    <PageWrapper className="flex min-h-screen items-center justify-center">
      <EmptyState
        title="Register"
        description="Account creation UI will be added in the dedicated authentication prompt."
      />
    </PageWrapper>
  )
}
