import { readFileSync } from 'node:fs'
import path from 'node:path'

const billingDirectory = path.join(
  process.cwd(),
  'src',
  'app',
  '(dashboard)',
  'settings',
  'organization',
  'billing'
)
const billingPage = readFileSync(path.join(billingDirectory, 'page.tsx'), 'utf8')
const plansPage = readFileSync(path.join(billingDirectory, 'plans', 'page.tsx'), 'utf8')

describe('billing hydration guards', () => {
  it.each([
    ['billing page', billingPage],
    ['plans page', plansPage],
  ])('does not use effect-driven mounted state in the %s', (_name, source) => {
    expect(source).not.toContain('hasMounted')
    expect(source).not.toContain('setHasMounted')
    expect(source).toContain("auth.status !== 'loading'")
  })
})
