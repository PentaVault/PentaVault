import { existsSync } from 'node:fs'
import { join } from 'node:path'

const dashboardProjectRouteRoot = join(
  process.cwd(),
  'src',
  'app',
  '(dashboard)',
  'dashboard',
  'projects'
)

describe('dashboard project compatibility routes', () => {
  it.each([
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
  ])('keeps /dashboard/projects compatibility route for %s', (_name, relativePath) => {
    expect(existsSync(join(dashboardProjectRouteRoot, relativePath))).toBe(true)
  })
})
