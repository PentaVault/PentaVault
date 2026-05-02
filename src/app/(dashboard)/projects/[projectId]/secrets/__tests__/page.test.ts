import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('ProjectSecretsPage', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/app/(dashboard)/projects/[projectId]/secrets/page.tsx'),
    'utf8'
  )

  it('uses a top-level environment dropdown instead of environment tabs', () => {
    expect(source).toContain('@/components/ui/select')
    expect(source).toContain('setSelectedEnvironmentId(value)')
    expect(source).not.toContain('scopeTab')
  })

  it('always opens the add variable dialog with role-aware project scope permissions', () => {
    expect(source).toContain('Add variable')
    expect(source).toContain('allowProjectScope={canManageSecrets}')
  })
})
