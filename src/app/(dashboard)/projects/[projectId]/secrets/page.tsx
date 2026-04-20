'use client'

import { useParams } from 'next/navigation'

import { SecretCreateForm } from '@/components/dashboard/secret-create-form'
import { SecretsImportForm } from '@/components/dashboard/secrets-import-form'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProject } from '@/lib/hooks/use-projects'

export default function ProjectSecretsPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null
  const projectQuery = useProject(projectId)

  const projectName = projectQuery.data?.project.name ?? 'Project'

  if (!projectId) {
    return (
      <PageWrapper>
        <Card>
          <CardHeader>
            <CardTitle>Secrets</CardTitle>
            <CardDescription>Project context is required to manage secrets.</CardDescription>
          </CardHeader>
        </Card>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create secret</CardTitle>
            <CardDescription>
              Add one secret at a time for {projectName}. Use mode carefully based on provider
              support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SecretCreateForm projectId={projectId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import secrets</CardTitle>
            <CardDescription>
              Bulk import tokenized secrets using dotenv-style lines (`KEY=value`).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SecretsImportForm projectId={projectId} />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
