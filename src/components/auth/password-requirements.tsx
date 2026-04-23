'use client'

import { Check, Circle } from 'lucide-react'

import { getPasswordRequirements, isPasswordPolicySatisfied } from '@/lib/auth/password-policy'
import { cn } from '@/lib/utils/cn'

type PasswordRequirementsProps = {
  password: string
  visible: boolean
  confirmPassword?: string
  showPasswordRules?: boolean
}

export function PasswordRequirements({
  password,
  visible,
  confirmPassword,
  showPasswordRules = true,
}: PasswordRequirementsProps) {
  if (!visible) {
    return null
  }

  const requirements = getPasswordRequirements(password)
  const allValid = isPasswordPolicySatisfied(password)
  const hasConfirmPassword = typeof confirmPassword === 'string' && confirmPassword.length > 0
  const passwordsMatch = hasConfirmPassword && password.length > 0 && password === confirmPassword

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background-secondary px-3 py-2">
      {showPasswordRules ? (
        allValid ? (
          <div className="flex items-center gap-2 text-sm text-[#3ecf8e]">
            <Check className="h-4 w-4" />
            Password requirements met
          </div>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {requirements.map((requirement) => (
              <li
                key={requirement.id}
                className={cn('flex items-center gap-2', requirement.valid && 'text-[#3ecf8e]')}
              >
                {requirement.valid ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
                {requirement.label}
              </li>
            ))}
          </ul>
        )
      ) : null}

      {hasConfirmPassword ? (
        <div
          className={cn(
            'flex items-center gap-2 text-sm',
            passwordsMatch ? 'text-[#3ecf8e]' : 'text-muted-foreground'
          )}
        >
          {passwordsMatch ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
          Passwords match
        </div>
      ) : null}
    </div>
  )
}
