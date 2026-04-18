import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'

export default function ProjectAuditPage() {
  return (
    <PageWrapper>
      <EmptyState
        title="Audit log"
        description="Audit log browsing UI will be layered on top of the typed API foundation later."
      />
    </PageWrapper>
  )
}
