import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'

export default function ProjectUsagePage() {
  return (
    <PageWrapper>
      <EmptyState
        title="Usage"
        description="Usage metrics UI is reserved for a future prompt and the backend route does not exist yet."
      />
    </PageWrapper>
  )
}
