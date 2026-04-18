import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'

export default function ProjectsPage() {
  return (
    <PageWrapper>
      <EmptyState
        title="Projects"
        description="Project list UI will be implemented in a follow-up prompt."
      />
    </PageWrapper>
  )
}
