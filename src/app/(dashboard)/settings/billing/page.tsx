import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'

export default function BillingPage() {
  return (
    <PageWrapper>
      <EmptyState
        title="Billing"
        description="Billing remains a placeholder until the billing feature prompt arrives."
      />
    </PageWrapper>
  )
}
