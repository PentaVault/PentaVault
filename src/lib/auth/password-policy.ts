export type PasswordRequirement = {
  id: 'length' | 'uppercase' | 'lowercase' | 'number' | 'special'
  label: string
  valid: boolean
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      id: 'length',
      label: 'At least 8 characters',
      valid: password.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter',
      valid: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'One lowercase letter',
      valid: /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'One number',
      valid: /[0-9]/.test(password),
    },
    {
      id: 'special',
      label: 'One special character',
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ]
}

export function isPasswordPolicySatisfied(password: string): boolean {
  return getPasswordRequirements(password).every((requirement) => requirement.valid)
}
