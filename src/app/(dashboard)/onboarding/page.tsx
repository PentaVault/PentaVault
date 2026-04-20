import Link from 'next/link'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { StatusBadge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PROJECTS_PATH } from '@/lib/constants'

export default function OnboardingPage() {
  return (
    <PageWrapper>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding</CardTitle>
            <CardDescription>
              Complete these steps to start secure runtime secret workflows with your team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-2">
              <StatusBadge tone="success">Phase 1 done</StatusBadge>
              <StatusBadge tone="success">Phase 2 done</StatusBadge>
              <StatusBadge tone="warning">Auth rollout active</StatusBadge>
            </div>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Create your first project workspace.</li>
              <li>Import secrets using compatibility or gateway mode.</li>
              <li>Issue and test proxy tokens for your local workflows.</li>
              <li>Invite teammates and assign roles.</li>
              <li>Review audit and security recommendations regularly.</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Start now</CardTitle>
            <CardDescription>Jump to projects and complete step one.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              className="inline-flex h-9 items-center rounded-md border border-accent/35 px-8 py-2 text-sm font-medium text-accent transition-colors hover:border-accent/50 hover:text-accent-strong"
              href={PROJECTS_PATH}
            >
              Open projects
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
