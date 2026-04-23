import { getPasswordRequirements, isPasswordPolicySatisfied } from '@/lib/auth/password-policy'

describe('password policy', () => {
  it('accepts strong passwords', () => {
    expect(isPasswordPolicySatisfied('StrongPass1!')).toBe(true)
  })

  it('rejects passwords that miss required character classes', () => {
    const requirements = getPasswordRequirements('password1')
    expect(requirements.find((item) => item.id === 'uppercase')?.valid).toBe(false)
    expect(requirements.find((item) => item.id === 'special')?.valid).toBe(false)
    expect(isPasswordPolicySatisfied('password1')).toBe(false)
  })
})
