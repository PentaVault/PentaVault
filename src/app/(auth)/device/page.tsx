'use client'

import Link from 'next/link'
import type { FormEvent } from 'react'
import { useRef, useState } from 'react'

import { AuthPanel } from '@/components/auth/auth-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/api/auth'
import { DEVICE_PATH, LOGIN_PATH, REGISTER_PATH } from '@/lib/constants'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

const DEVICE_CODE_LENGTH = 6
const DEVICE_CODE_INPUT_KEYS = Array.from(
  { length: DEVICE_CODE_LENGTH },
  (_, index) => `device-code-character-${index}`
)

function normalizeDeviceCode(value: string): string {
  return value
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, DEVICE_CODE_LENGTH)
}

function formatDeviceCode(value: string): string {
  const normalizedCode = normalizeDeviceCode(value)

  if (normalizedCode.length <= 3) {
    return normalizedCode
  }

  return `${normalizedCode.slice(0, 3)}-${normalizedCode.slice(3)}`
}

export default function DeviceApprovalPage() {
  const { toast } = useToast()
  const { activeOrganization, session, status } = useAuth()
  const [codeCharacters, setCodeCharacters] = useState<string[]>(
    Array.from({ length: DEVICE_CODE_LENGTH }, () => '')
  )
  const [isCodeStep, setIsCodeStep] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const codeInputsRef = useRef<Array<HTMLInputElement | null>>([])

  const isAuthenticated = status === 'authenticated' && Boolean(session?.user.id)
  const accountName =
    session?.user.name?.trim() || session?.user.username?.trim() || 'PentaVault user'
  const accountEmail = session?.user.email?.trim() ?? 'No email on file'
  const normalizedCode = codeCharacters.join('')
  const formattedCode = formatDeviceCode(normalizedCode)

  function setCodeFromValue(value: string): void {
    const nextCode = normalizeDeviceCode(value)
    setCodeCharacters(
      Array.from({ length: DEVICE_CODE_LENGTH }, (_, index) => nextCode[index] ?? '')
    )
    setError(null)

    const nextFocusIndex = Math.min(nextCode.length, DEVICE_CODE_LENGTH - 1)
    window.requestAnimationFrame(() => {
      codeInputsRef.current[nextFocusIndex]?.focus()
    })
  }

  function updateCodeCharacter(index: number, value: string): void {
    const character = normalizeDeviceCode(value).slice(-1)
    const nextCode = [...codeCharacters]
    nextCode[index] = character
    setCodeCharacters(nextCode)
    setError(null)

    if (character && index < DEVICE_CODE_LENGTH - 1) {
      codeInputsRef.current[index + 1]?.focus()
    }
  }

  function handleCodeKeyDown(index: number, key: string): void {
    if (key === 'Backspace' && !codeCharacters[index] && index > 0) {
      codeInputsRef.current[index - 1]?.focus()
    }
  }

  async function submitApprovalCode(): Promise<void> {
    setError(null)

    if (normalizedCode.length !== DEVICE_CODE_LENGTH) {
      setError('Enter the 6-character device code from your CLI.')
      return
    }

    try {
      setIsApproving(true)
      await authApi.approveDevice(normalizedCode)
      toast.success('Device approved successfully.')
      setCodeCharacters(Array.from({ length: DEVICE_CODE_LENGTH }, () => ''))
    } catch (submitError) {
      const message = getApiFriendlyMessage(submitError, 'Unable to approve device right now.')
      setError(message)
      toast.error(message)
    } finally {
      setIsApproving(false)
    }
  }

  async function submitApproval(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    await submitApprovalCode()
  }

  if (status === 'loading') {
    return (
      <AuthPanel
        eyebrow="Device Approval"
        title="Approve CLI sign in"
        description="Checking your current PentaVault session."
      >
        <div className="rounded-lg border border-border bg-background-secondary p-4 text-sm text-muted-foreground">
          Checking account...
        </div>
      </AuthPanel>
    )
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(DEVICE_PATH)

    return (
      <AuthPanel
        eyebrow="Device Approval"
        title="Sign in to continue"
        description="Use your PentaVault account before approving this CLI authorization request."
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-background-secondary p-4 text-sm text-muted-foreground">
            Sign in or create an account, then return here to approve the device code shown in your
            CLI.
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild className="w-full">
              <Link href={`${LOGIN_PATH}?next=${next}`}>Sign in</Link>
            </Button>
            <Button asChild className="w-full" variant="outline">
              <Link href={`${REGISTER_PATH}?next=${next}`}>Create account</Link>
            </Button>
          </div>
        </div>
      </AuthPanel>
    )
  }

  if (!isCodeStep) {
    return (
      <AuthPanel
        eyebrow="Device Approval"
        title="Continue with this account"
        description="Confirm the account that will approve this CLI authorization request."
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-background-secondary p-4">
            <p className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
              Signed in as
            </p>
            <p className="mt-2 truncate text-sm font-medium text-foreground">{accountName}</p>
            <p className="mt-1 truncate text-sm text-muted-foreground">{accountEmail}</p>
            {activeOrganization ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {activeOrganization.organization.name} - {activeOrganization.membership.role}
              </p>
            ) : null}
          </div>

          <Button className="w-full" onClick={() => setIsCodeStep(true)} type="button">
            Continue
          </Button>
        </div>
      </AuthPanel>
    )
  }

  return (
    <AuthPanel
      eyebrow="Device Approval"
      title="Approve CLI sign in"
      description="Enter the device code from your CLI to approve this authorization request."
    >
      <form className="space-y-5" onSubmit={(event) => void submitApproval(event)}>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label
              className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor="device-code-0"
            >
              User code
            </label>
            {formattedCode ? (
              <span className="font-mono text-xs text-[#00c573]">{formattedCode}</span>
            ) : null}
          </div>

          <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_auto_repeat(3,minmax(0,1fr))] items-center gap-1.5">
            {DEVICE_CODE_INPUT_KEYS.map((key, index) => (
              <div className="contents" key={key}>
                {index === 3 ? (
                  <span className="px-1 text-center font-mono text-lg text-muted-foreground">
                    -
                  </span>
                ) : null}
                <Input
                  id={`device-code-${index}`}
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  className={cn(
                    'h-11 px-0 text-center font-mono text-base uppercase',
                    error && 'border-danger focus-visible:ring-danger'
                  )}
                  inputMode="text"
                  maxLength={1}
                  onChange={(event) => updateCodeCharacter(index, event.target.value)}
                  onKeyDown={(event) => handleCodeKeyDown(index, event.key)}
                  onPaste={(event) => {
                    event.preventDefault()
                    setCodeFromValue(event.clipboardData.getData('text'))
                  }}
                  ref={(element) => {
                    codeInputsRef.current[index] = element
                  }}
                  value={codeCharacters[index] ?? ''}
                />
              </div>
            ))}
          </div>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <Button className="w-full" disabled={isApproving} type="submit">
          {isApproving ? 'Approving...' : 'Approve'}
        </Button>
      </form>
    </AuthPanel>
  )
}
