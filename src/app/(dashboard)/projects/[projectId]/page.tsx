import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'

export default function ProjectOverviewPage() {
  return (
    <PageWrapper>
      <EmptyState
        title="Project overview"
        description="Project detail UI is intentionally left as a placeholder during the setup phase."
      />
    </PageWrapper>
  )
}
