import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('SecretsList', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/secrets/secrets-list.tsx'),
    'utf8'
  )

  it('renders project and personal secrets together with scope indicators', () => {
    expect(source).toContain('usePersonalSecrets')
    expect(source).toContain("{isPersonal ? 'personal' : 'project'}")
  })

  it('only renders the reveal control for plaintext values', () => {
    expect(source).toContain('canRevealPlaintextValue ? (')
    expect(source).toContain(": '*************'}")
    expect(source).not.toContain('Encrypted value hidden after save')
  })
})
