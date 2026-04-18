import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'

export default function OnboardingPage() {
  return (
    <PageWrapper>
      <EmptyState
        title="Onboarding"
        description="First-run onboarding is intentionally postponed until the setup baseline is verified."
      />
    </PageWrapper>
  )
}
