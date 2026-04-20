'use client'

import { useParams } from 'next/navigation'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProject } from '@/lib/hooks/use-projects'

export default function ProjectUsagePage() {
  const params = useParams<{ projectId: string }>()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null
  const projectQuery = useProject(projectId)

  const projectName = projectQuery.data?.project.name ?? 'Project'

  return (
    <PageWrapper>
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            Usage remains unavailable for {projectName}. Backend usage endpoint is not implemented
            yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This page intentionally indicates backend capability status to avoid misleading analytics
          behavior.
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
