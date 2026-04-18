import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'

export default function ApiKeysPage() {
  return (
    <PageWrapper>
      <EmptyState
        title="API keys"
        description="CLI API key management UI will be added in a separate prompt."
      />
    </PageWrapper>
  )
}
