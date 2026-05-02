import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('AddSecretDialog', () => {
  it('uses shared Select for scope and never falls back to a native select', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/secrets/add-secret-dialog.tsx'),
      'utf8'
    )

    expect(source).toContain('@/components/ui/select')
    expect(source).not.toContain('<select')
    expect(source).not.toContain('</select>')
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

  it('keeps project scope gated behind the role-aware option', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/secrets/add-secret-dialog.tsx'),
      'utf8'
    )

    expect(source).toContain('allowProjectScope')
    expect(source).toContain('Save as')
    expect(source).toContain('Members save variables to Personal first')
  })
})
