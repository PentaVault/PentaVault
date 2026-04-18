import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'

export default function ProjectTokensPage() {
  return (
    <PageWrapper>
      <EmptyState
        title="Tokens"
        description="Per-developer proxy token controls are deferred to a dedicated prompt."
      />
    </PageWrapper>
  )
}
