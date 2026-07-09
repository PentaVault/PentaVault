import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// The canonical flat route tree is the single source of truth for project
// pages. Legacy trees (/dashboard/projects, /dashboard/org/[orgId]) are
// redirect-shadowed by the middleware (see src/__tests__/proxy.test.ts), so the
// invariant worth guarding here is that every canonical project route exists.
const canonicalProjectsRoot = join(process.cwd(), 'src', 'app', '(dashboard)', 'projects')

const projectRouteFiles = [
  ['index', 'page.tsx'],
  ['overview', '[projectId]/page.tsx'],
  ['analytics', '[projectId]/analytics/page.tsx'],
  ['audit', '[projectId]/audit/page.tsx'],
  ['secrets', '[projectId]/secrets/page.tsx'],
  ['security', '[projectId]/security/page.tsx'],
  ['settings', '[projectId]/settings/page.tsx'],
  ['team', '[projectId]/team/page.tsx'],
  ['tokens', '[projectId]/tokens/page.tsx'],
  ['usage', '[projectId]/usage/page.tsx'],
] as const

const canonicalTopLevelRoutes = [
  ['dashboard', 'dashboard/page.tsx'],
  ['activity', 'activity/page.tsx'],
  ['change-requests', 'change-requests/page.tsx'],
  ['settings redirect', 'settings/page.tsx'],
  ['organization settings', 'settings/organization/page.tsx'],
  ['organization members', 'settings/organization/members/page.tsx'],
  ['organization access', 'settings/organization/access/page.tsx'],
  ['organization billing', 'settings/organization/billing/page.tsx'],
  ['account settings', 'settings/account/page.tsx'],
  ['account security', 'settings/account/security/page.tsx'],
  ['account sessions', 'settings/account/sessions/page.tsx'],
  ['account tokens', 'settings/account/tokens/page.tsx'],
] as const

const dashboardRoot = join(process.cwd(), 'src', 'app', '(dashboard)')

describe('canonical dashboard routes', () => {
  it.each(projectRouteFiles)('exposes the canonical project %s route', (_name, relativePath) => {
    expect(existsSync(join(canonicalProjectsRoot, relativePath))).toBe(true)
  })

  it.each(canonicalTopLevelRoutes)('exposes the canonical %s route', (_name, relativePath) => {
    expect(existsSync(join(dashboardRoot, relativePath))).toBe(true)
  })
})
