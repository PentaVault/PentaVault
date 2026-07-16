import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('SecretsList', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/secrets/secrets-list.tsx'),
    'utf8'
  )

  it('renders branch-scoped secrets without personal/project overlays', () => {
    expect(source).not.toContain('usePersonalSecrets')
    expect(source).not.toContain('usePromotePersonalSecret')
    expect(source).toContain('branch')
    expect(source).toContain('grid-cols-[minmax(10rem,1fr)_6.5rem_7.25rem]')
    expect(source).toContain('flex w-8 justify-end')
    expect(source).not.toContain("secret.scope ?? 'project'")
  })

  it('only renders the reveal control for plaintext values', () => {
    expect(source).toContain('canRevealPlaintextValue ? (')
    expect(source).toContain('flex w-4 items-center justify-center')
    expect(source).toContain("'unencrypted'")
    expect(source).toContain(": '*************'}")
    expect(source).not.toContain('Encrypted value hidden after save')
  })

  it('falls back to legacy environment slugs when environment ids are missing', () => {
    expect(source).toContain('filterSecretsForWorkspace')
    expect(source).toContain('folderFilter')
    expect(source).toContain('tagFilter')
    expect(source).toContain('Edit details')
  })
})
