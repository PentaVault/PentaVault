import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('captcha-protected auth submissions', () => {
  it('exposes an imperative Turnstile reset that clears consumed tokens', () => {
    const source = readSource('src/components/auth/turnstile-widget.tsx')

    expect(source).toContain('export type TurnstileWidgetHandle')
    expect(source).toContain('reset: () => {')
    expect(source).toContain("onToken('')")
    expect(source).toContain('window.turnstile.reset(widgetIdRef.current)')
  })

  it.each([
    'src/components/auth/login-form.tsx',
    'src/components/auth/register-form.tsx',
    'src/components/auth/forgot-password-form.tsx',
    'src/app/(dashboard)/settings/account/security/page.tsx',
  ])('resets captcha state after protected submissions in %s', (relativePath) => {
    const source = readSource(relativePath)

    expect(source).toContain('captchaWidgetRef')
    expect(source).toContain('resetCaptchaToken')
    expect(source).toContain('captchaWidgetRef.current?.reset()')
  })
})
