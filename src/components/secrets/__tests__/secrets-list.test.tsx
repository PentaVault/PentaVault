import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('SecretsList', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/secrets/secrets-list.tsx'),
    'utf8'
  )

  it('keeps personal secrets user-scoped while rendering fixed scope indicators', () => {
    expect(source).toContain('usePersonalSecrets')
    expect(source).toContain('usePersonalSecrets(projectId, enabled && !canManage)')
    expect(source).toContain("{isPersonal ? 'personal' : 'project'}")
    expect(source).toContain('grid-cols-[minmax(10rem,1fr)_6.5rem_7.25rem]')
    expect(source).toContain('flex w-8 justify-end')
    expect(source).not.toContain("if ((secret.scope ?? 'project') !== 'project')")
  })

  it('only renders the reveal control for plaintext values', () => {
    expect(source).toContain('canRevealPlaintextValue ? (')
    expect(source).toContain('flex w-4 items-center justify-center')
    expect(source).toContain("'unencrypted'")
    expect(source).toContain(": '*************'}")
    expect(source).not.toContain('Encrypted value hidden after save')
  })
})
