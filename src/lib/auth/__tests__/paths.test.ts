import {
  buildLoginRedirectPath,
  normalizeNextPath,
  preserveShareTokenFragment,
} from '@/lib/auth/paths'

describe('auth redirect paths', () => {
  it('preserves only valid internal next paths', () => {
    expect(normalizeNextPath('/share')).toBe('/share')
    expect(normalizeNextPath('https://evil.example')).toBeNull()
    expect(normalizeNextPath('//evil.example')).toBeNull()
    expect(buildLoginRedirectPath('/share')).toBe('/login?next=%2Fshare')
  })

  it('carries a share token through login only as a URL fragment', () => {
    const fragment = `#pvs_${'a'.repeat(43)}`
    expect(preserveShareTokenFragment('/share', fragment)).toBe(`/share${fragment}`)
    expect(preserveShareTokenFragment('/dashboard', fragment)).toBe('/dashboard')
    expect(preserveShareTokenFragment('/share', '#pvs_short')).toBe('/share')
  })
})
