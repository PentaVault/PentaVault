import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('ProjectSecretsPage', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/app/(dashboard)/projects/[projectId]/secrets/page.tsx'),
    'utf8'
  )

  it('uses top-level environment tabs and secondary config tabs', () => {
    expect(source).toContain('useProjectConfigs')
    expect(source).toContain('setSelectedEnvironmentId(environment.id)')
    expect(source).toContain('environmentConfigs.map')
    expect(source).toContain('setSelectedConfigId(config.id)')
    expect(source).toContain('New branch')
    expect(source).not.toContain('scopeTab')
  })

  it('opens the add variable dialog only for writable project roles', () => {
    expect(source).toContain('Add variable')
    expect(source).toContain('const canCreateSecrets =')
    expect(source).toContain('canAccessProject &&')
    expect(source).toContain("effectiveRole === 'developer'")
    expect(source).toContain("effectiveRole === 'member'")
    expect(source).toContain('canEditSelectedConfig')
    expect(source).toContain('{canCreateSecrets && canEditSelectedConfig ? (')
    expect(source).not.toContain('allowProjectScope=')
    expect(source).toContain("environment.slug === 'development'")
    expect(source).not.toContain('{canAccessProject ? (\n            <Button')
  })
})
