import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'

export default function DashboardOverviewPage() {
  return (
    <PageWrapper>
      <EmptyState
        title="Dashboard overview"
        description="The authenticated dashboard home is reserved for a later prompt. This placeholder avoids a route collision with the public landing page at /."
      />
    </PageWrapper>
  )
}
