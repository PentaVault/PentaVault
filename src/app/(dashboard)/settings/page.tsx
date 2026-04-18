import { PageWrapper } from '@/components/layout/page-wrapper'
import { EmptyState } from '@/components/shared/empty-state'

export default function SettingsPage() {
  return (
    <PageWrapper>
      <EmptyState
        title="Settings"
        description="Account settings are intentionally left unimplemented during the initialization phase."
      />
    </PageWrapper>
  )
}
