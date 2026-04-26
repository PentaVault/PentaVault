'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { CreateProbableLeakAlertForm } from '@/components/dashboard/create-probable-leak-alert-form'
import { SecurityAlertStatusSelect } from '@/components/dashboard/security-alert-status-select'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { StatusBadge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getOrgProjectPath, getProjectPath } from '@/lib/constants'
import { useProject } from '@/lib/hooks/use-projects'
import { useProjectSecurity } from '@/lib/hooks/use-security'
import { formatDateTime } from '@/lib/utils/format'

function severityTone(severity: 'low' | 'medium' | 'high' | 'critical') {
  return severity === 'critical' ? 'danger' : severity === 'high' ? 'warning' : 'neutral'
}

export default function ProjectSecurityPage() {
  const params = useParams<{ orgId?: string; projectId: string }>()
  const router = useRouter()
  const projectId = typeof params.projectId === 'string' ? params.projectId : null
  const projectQuery = useProject(projectId)
  const effectiveRole = projectQuery.data?.effectiveRole ?? projectQuery.data?.orgRole ?? null
  const canReadSecurity = effectiveRole === 'owner' || effectiveRole === 'admin'
  const security = useProjectSecurity(projectId, canReadSecurity)
  const overviewPath = projectId
    ? params.orgId
      ? getOrgProjectPath(params.orgId, projectId)
      : getProjectPath(projectId)
    : null

  useEffect(() => {
    if (!projectQuery.isLoading && projectQuery.data && !canReadSecurity && overviewPath) {
      router.replace(overviewPath)
    }
  }, [canReadSecurity, overviewPath, projectQuery.data, projectQuery.isLoading, router])

  if (projectQuery.isLoading) {
    return (
      <PageWrapper>
        <Card>
          <CardHeader>
            <CardTitle>Security center</CardTitle>
            <CardDescription>Loading project context...</CardDescription>
          </CardHeader>
        </Card>
      </PageWrapper>
    )
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <PageWrapper>
        <Card>
          <CardHeader>
            <CardTitle>Security center unavailable</CardTitle>
            <CardDescription>
              The selected project could not be loaded or you do not have access.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageWrapper>
    )
  }

  if (!projectId) {
    return (
      <PageWrapper>
        <Card>
          <CardHeader>
            <CardTitle>Security center</CardTitle>
            <CardDescription>Project context is required to load this page.</CardDescription>
          </CardHeader>
        </Card>
      </PageWrapper>
    )
  }

  if (!canReadSecurity) {
    return (
      <PageWrapper>
        <Card>
          <CardHeader>
            <CardTitle>Security center</CardTitle>
            <CardDescription>Redirecting to the project overview...</CardDescription>
          </CardHeader>
        </Card>
      </PageWrapper>
    )
  }

  const alerts = security.alertsQuery.data?.alerts ?? []
  const recommendations = security.recommendationsQuery.data?.recommendations ?? []
  const projectName = projectQuery.data?.project.name ?? 'Project'

  return (
    <PageWrapper>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Security center</CardTitle>
            <CardDescription>
              Manage probable leak alerts and review rotation recommendations for {projectName}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateProbableLeakAlertForm projectId={projectId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>
              {security.alertsQuery.isLoading
                ? 'Loading alerts...'
                : `${alerts.length} alert${alerts.length === 1 ? '' : 's'}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {security.alertsQuery.isError ? (
              <p className="text-sm text-danger">Unable to load security alerts right now.</p>
            ) : alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No alerts found for this project yet.</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{alert.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{alert.summary}</p>
                      </div>
                      <div className="w-56">
                        <SecurityAlertStatusSelect
                          alertId={alert.id}
                          projectId={projectId}
                          value={alert.status}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {alert.alertType} • created: {formatDateTime(alert.createdAt)}
                    </p>
                    <div className="mt-2">
                      <StatusBadge tone={severityTone(alert.severity)}>
                        {alert.severity}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rotation recommendations</CardTitle>
            <CardDescription>
              {security.recommendationsQuery.isLoading
                ? 'Loading recommendations...'
                : `${recommendations.length} recommendation${recommendations.length === 1 ? '' : 's'}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {security.recommendationsQuery.isError ? (
              <p className="text-sm text-danger">Unable to load recommendations right now.</p>
            ) : recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recommendations found yet.</p>
            ) : (
              <div className="space-y-3">
                {recommendations.map((recommendation) => (
                  <div key={recommendation.id} className="rounded-xl border border-border p-3">
                    <p className="font-medium">
                      <StatusBadge
                        tone={
                          recommendation.recommendedAction === 'provider_secret_rotate'
                            ? 'warning'
                            : recommendation.recommendedAction === 'token_revoke'
                              ? 'danger'
                              : 'neutral'
                        }
                      >
                        {recommendation.recommendedAction}
                      </StatusBadge>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{recommendation.rationale}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      status: {recommendation.status} • created:{' '}
                      {formatDateTime(recommendation.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
