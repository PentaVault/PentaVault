import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('AddSecretDialog', () => {
  it('removes the old personal/project scope selector', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/secrets/add-secret-dialog.tsx'),
      'utf8'
    )

    expect(source).not.toContain('@/components/ui/select')
    expect(source).not.toContain('<select')
    expect(source).not.toContain('</select>')
    expect(source).not.toContain('Save as')
    expect(source).not.toContain('allowProjectScope')
  })

  it('keeps storage mode as a compact footer toggle', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/secrets/add-secret-dialog.tsx'),
      'utf8'
    )

    expect(source).toContain('@/components/ui/switch')
    expect(source).toContain('Toggle encrypted storage')
    expect(source).toContain("setEncryptionMode(checked ? 'encrypted' : 'plaintext')")
    expect(source).not.toContain('htmlFor="storage-mode"')
  })

  it('saves variables directly to the selected branch config', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/secrets/add-secret-dialog.tsx'),
      'utf8'
    )

    expect(source).toContain('configId')
    expect(source).toContain('useCreateSecrets')
    expect(source).not.toContain('useCreatePersonalSecret')
    expect(source).not.toContain('MEMBER_DEVELOPMENT_ONLY_MESSAGE')
    expect(source).toContain('SECRET_NAME_PATTERN')
  })
})
