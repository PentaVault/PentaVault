import {
  getOrgProjectAnalyticsPath,
  getOrgProjectAuditPath,
  getOrgProjectObservabilityPath,
  getOrgProjectPath,
  getOrgProjectSecretsPath,
  getOrgProjectSecurityPath,
  getOrgProjectSettingsPath,
  getOrgProjectsPath,
  getOrgProjectTeamPath,
  getOrgProjectTokensPath,
  getOrgProjectUsagePath,
  getProjectAnalyticsPath,
  getProjectAuditPath,
  getProjectObservabilityPath,
  getProjectPath,
  getProjectSecretsPath,
  getProjectSecurityPath,
  getProjectSettingsPath,
  getProjectTeamPath,
  getProjectTokensPath,
  getProjectUsagePath,
  PROJECTS_PATH,
} from '@/lib/constants'
import nextConfig from '../../../next.config'

describe('project route helpers', () => {
  it('uses /projects as the single canonical projects route', () => {
    expect(getOrgProjectsPath('org_1')).toBe(PROJECTS_PATH)
    expect(getOrgProjectPath('org_1', 'project_1')).toBe(getProjectPath('project_1'))
    expect(getOrgProjectSecretsPath('org_1', 'project_1')).toBe(getProjectSecretsPath('project_1'))
    expect(getOrgProjectTokensPath('org_1', 'project_1')).toBe(getProjectTokensPath('project_1'))
    expect(getOrgProjectTeamPath('org_1', 'project_1')).toBe(getProjectTeamPath('project_1'))
    expect(getOrgProjectAuditPath('org_1', 'project_1')).toBe(getProjectAuditPath('project_1'))
    expect(getOrgProjectUsagePath('org_1', 'project_1')).toBe(getProjectUsagePath('project_1'))
    expect(getOrgProjectAnalyticsPath('org_1', 'project_1')).toBe(
      getProjectAnalyticsPath('project_1')
    )
    expect(getOrgProjectObservabilityPath('org_1', 'project_1')).toBe(
      getProjectObservabilityPath('project_1')
    )
    expect(getProjectUsagePath('project_1')).toBe(getProjectObservabilityPath('project_1'))
    expect(getProjectAnalyticsPath('project_1')).toBe(getProjectObservabilityPath('project_1'))
    expect(getOrgProjectSecurityPath('org_1', 'project_1')).toBe(
      getProjectSecurityPath('project_1')
    )
    expect(getOrgProjectSettingsPath('org_1', 'project_1')).toBe(
      getProjectSettingsPath('project_1')
    )
  })

  it('redirects legacy dashboard project routes to the canonical route', async () => {
    const redirects = nextConfig.redirects ? await nextConfig.redirects() : []

    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: '/dashboard/projects',
          destination: '/projects',
        }),
        expect.objectContaining({
          source: '/dashboard/projects/:path*',
          destination: '/projects/:path*',
        }),
        expect.objectContaining({
          source: '/dashboard/org/:orgId/projects',
          destination: '/projects',
        }),
        expect.objectContaining({
          source: '/dashboard/org/:orgId/projects/:path*',
          destination: '/projects/:path*',
        }),
        expect.objectContaining({
          source: '/projects/:projectId/usage',
          destination: '/projects/:projectId/observability',
        }),
        expect.objectContaining({
          source: '/projects/:projectId/analytics',
          destination: '/projects/:projectId/observability',
        }),
      ])
    )
  })
})
