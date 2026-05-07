import { existsSync } from 'node:fs'
import { join } from 'node:path'

const projectRouteRoots = [
  ['canonical /projects', join(process.cwd(), 'src', 'app', '(dashboard)', 'projects')],
  [
    'legacy /dashboard/projects',
    join(process.cwd(), 'src', 'app', '(dashboard)', 'dashboard', 'projects'),
  ],
  [
    'legacy /dashboard/org/:orgId/projects',
    join(process.cwd(), 'src', 'app', '(dashboard)', 'dashboard', 'org', '[orgId]', 'projects'),
  ],
] as const

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

const dashboardProjectRouteRoot = join(
  process.cwd(),
  'src',
  'app',
  '(dashboard)',
  'dashboard',
  'projects'
)

describe('dashboard project compatibility routes', () => {
  it.each(
    projectRouteFiles
  )('keeps /dashboard/projects compatibility route for %s', (_name, relativePath) => {
    expect(existsSync(join(dashboardProjectRouteRoot, relativePath))).toBe(true)
  })

  it.each(projectRouteRoots)('keeps %s route files aligned', (routeName, routeRoot) => {
    for (const [name, relativePath] of projectRouteFiles) {
      if (relativePath === 'page.tsx' && routeName === 'legacy /dashboard/org/:orgId/projects') {
        continue
      }

      expect(existsSync(join(routeRoot, relativePath)), `${name}: ${relativePath}`).toBe(true)
    }
  })
})
