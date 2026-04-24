'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Check, Copy, KeyRound, QrCode, RefreshCcw, ShieldCheck, ShieldOff } from 'lucide-react'
import QRCode from 'qrcode'

import { CopyButton } from '@/components/shared/copy-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { authApi } from '@/lib/api/auth'
import { useToast } from '@/lib/hooks/use-toast'
import type { AuthSession } from '@/lib/types/auth'
import { cn } from '@/lib/utils/cn'
import { copyToClipboard } from '@/lib/utils/copy'
import {
  getApiErrorPayload,
  getApiFieldErrors,
  getApiFriendlyMessageWithRef,
} from '@/lib/utils/errors'

type MfaSettingsCardProps = {
  user: AuthSession['user'] | null | undefined
  onChanged: () => Promise<void>
}

type SetupState = {
  totpURI: string
  backupCodes: string[]
}

type EnabledAction = 'disable' | 'change' | null
type VerificationMethod = 'totp' | 'recovery'

function RecoveryCodeInputs({
  value,
  onChange,
  error,
  idPrefix,
}: {
  value: string[]
  onChange: (next: string[]) => void
  error?: string
  idPrefix: string
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  function updateAt(index: number, raw: string) {
    const character = raw
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(-1)
      .toUpperCase()
    const next = [...value]
    next[index] = character
    onChange(next)
    if (character && index < 9) {
      refs.current[index + 1]?.focus()
    }
  }

  function handlePaste(raw: string) {
    const normalized = raw
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 10)
      .toUpperCase()
    onChange(Array.from({ length: 10 }, (_, index) => normalized[index] ?? ''))
  }

  return (
    <div className="space-y-1">
      <label className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
        Recovery code
      </label>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, index) => (
          <Input
            key={`${idPrefix}-${index}`}
            id={`${idPrefix}-${index}`}
            ref={(element) => {
              refs.current[index] = element
            }}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            className={cn(
              'h-11 px-0 text-center font-mono text-sm',
              error && 'border-danger focus-visible:ring-danger'
            )}
            inputMode="text"
            maxLength={1}
            value={value[index] ?? ''}
            onChange={(event) => updateAt(index, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && !value[index] && index > 0) {
                refs.current[index - 1]?.focus()
              }
            }}
            onPaste={(event) => {
              event.preventDefault()
              handlePaste(event.clipboardData.getData('text'))
            }}
          />
        ))}
      </div>
      <p className={cn('min-h-5 text-sm', error ? 'text-danger' : 'text-muted-foreground')}>
        {error ?? '\u00A0'}
      </p>
    </div>
  )
}

export function MfaSettingsCard({ user, onChanged }: MfaSettingsCardProps) {
  const { toast } = useToast()
  const [setup, setSetup] = useState<SetupState | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copiedUri, setCopiedUri] = useState(false)
  const [isStartingSetup, setIsStartingSetup] = useState(false)
  const [isVerifyingSetup, setIsVerifyingSetup] = useState(false)
  const [enabledAction, setEnabledAction] = useState<EnabledAction>(null)
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('totp')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState<string[]>(Array.from({ length: 10 }, () => ''))
  const [setupCode, setSetupCode] = useState('')
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const backupCodesText = useMemo(() => setup?.backupCodes.join('\n') ?? '', [setup])
  const recoveryCodeJoined = recoveryCode.join('')

  useEffect(() => {
    let cancelled = false

    async function renderQrCode() {
      if (!setup?.totpURI) {
        setQrDataUrl('')
        return
      }

      try {
        const dataUrl = await QRCode.toDataURL(setup.totpURI, {
          errorCorrectionLevel: 'M',
          margin: 1,
          scale: 6,
          width: 192,
        })

        if (!cancelled) {
          setQrDataUrl(dataUrl)
        }
      } catch {
        if (!cancelled) {
          setQrDataUrl('')
          toast.error('Unable to render the authenticator QR code right now.')
        }
      }
    }

    void renderQrCode()

    return () => {
      cancelled = true
    }
  }, [setup?.totpURI, toast])

  function resetActionState(nextAction: EnabledAction = null) {
    setEnabledAction(nextAction)
    setVerificationMethod('totp')
    setPassword('')
    setTotpCode('')
    setRecoveryCode(Array.from({ length: 10 }, () => ''))
    setFieldErrors({})
  }

  async function handleStartFreshSetup() {
    setFieldErrors({})
    if (!password) {
      setFieldErrors({ password: 'Enter your current password.' })
      return
    }

    try {
      setIsStartingSetup(true)
      const response = await authApi.enableMfa({ password })
      setSetup(response)
      setSetupCode('')
      setPassword('')
      toast.success('Authenticator setup created.')
    } catch (error) {
      const fields = getApiFieldErrors(error)
      if (fields?.password) {
        setFieldErrors({ password: fields.password })
        return
      }

      const payload = getApiErrorPayload(error)
      if (payload?.code === 'AUTH_PASSWORD_INVALID') {
        setFieldErrors({ password: 'The password you entered is incorrect.' })
      }

      toast.error(getApiFriendlyMessageWithRef(error, 'Unable to start MFA setup right now.'))
    } finally {
      setIsStartingSetup(false)
    }
  }

  async function handleStartChangeOrDisable() {
    setFieldErrors({})
    if (!password) {
      setFieldErrors({ password: 'Enter your current password.' })
      return
    }

    if (enabledAction === 'disable') {
      if (totpCode.length !== 6) {
        setFieldErrors({ code: 'Enter a valid 6-digit authenticator code.' })
        return
      }
    } else if (verificationMethod === 'totp') {
      if (totpCode.length !== 6) {
        setFieldErrors({ code: 'Enter a valid 6-digit authenticator code.' })
        return
      }
    } else if (recoveryCodeJoined.length !== 10) {
      setFieldErrors({ recoveryCode: 'Enter all 10 characters from one recovery code.' })
      return
    }

    try {
      setIsSubmittingAction(true)

      if (enabledAction === 'disable') {
        await authApi.disableMfa({ password, code: totpCode })
        await onChanged()
        resetActionState()
        toast.success('Multi-factor authentication has been disabled.')
        return
      }

      const response = await authApi.startMfaChange({
        password,
        verificationMethod,
        code:
          verificationMethod === 'totp'
            ? totpCode
            : `${recoveryCodeJoined.slice(0, 5)}-${recoveryCodeJoined.slice(5)}`,
      })
      setSetup(response)
      setSetupCode('')
      resetActionState()
      toast.success('Scan the new QR code and verify it to finish changing MFA.')
    } catch (error) {
      const fields = getApiFieldErrors(error)
      if (fields?.password || fields?.code) {
        setFieldErrors({
          ...(fields?.password ? { password: fields.password } : {}),
          ...(fields?.code ? { code: fields.code } : {}),
        })
        return
      }

      const payload = getApiErrorPayload(error)
      if (payload?.code === 'AUTH_PASSWORD_INVALID') {
        setFieldErrors({ password: 'The password you entered is incorrect.' })
      } else if (payload?.code === 'AUTH_MFA_CODE_INVALID') {
        setFieldErrors(
          verificationMethod === 'recovery'
            ? { recoveryCode: 'Enter a valid recovery code.' }
            : { code: 'Enter a valid 6-digit authenticator code.' }
        )
      }

      toast.error(
        getApiFriendlyMessageWithRef(
          error,
          enabledAction === 'disable'
            ? 'Unable to disable MFA right now.'
            : 'Unable to start MFA rotation right now.'
        )
      )
    } finally {
      setIsSubmittingAction(false)
    }
  }

  async function handleVerifySetup() {
    setFieldErrors({})
    if (setupCode.length !== 6) {
      setFieldErrors({ setupCode: 'Enter a valid 6-digit authenticator code.' })
      return
    }

    try {
      setIsVerifyingSetup(true)
      await authApi.verifyTotp({ code: setupCode })
      await onChanged()
      setSetup(null)
      setSetupCode('')
      toast.success(
        user?.twoFactorEnabled
          ? 'Multi-factor authentication updated.'
          : 'Multi-factor authentication enabled.'
      )
    } catch (error) {
      const payload = getApiErrorPayload(error)
      if (payload?.code === 'AUTH_MFA_CODE_INVALID') {
        setFieldErrors({ setupCode: 'The authenticator code is invalid.' })
      }

      toast.error(
        getApiFriendlyMessageWithRef(error, 'Unable to verify this authenticator code right now.')
      )
    } finally {
      setIsVerifyingSetup(false)
    }
  }

  async function copySetupUri() {
    if (!setup?.totpURI) {
      return
    }

    const didCopy = await copyToClipboard(setup.totpURI)
    if (!didCopy) {
      toast.error('Clipboard access is not available in this browser context.')
      return
    }

    setCopiedUri(true)
    toast.success('Authenticator setup URI copied.')
    window.setTimeout(() => setCopiedUri(false), 1500)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle>Multi-factor authentication</CardTitle>
            <CardDescription>
              Protect your account with a time-based code from an authenticator app.
            </CardDescription>
          </div>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
              user?.twoFactorEnabled
                ? 'border-success/35 bg-success/10 text-success'
                : 'border-border bg-background-secondary text-muted-foreground'
            )}
          >
            {user?.twoFactorEnabled ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <ShieldOff className="h-3.5 w-3.5" />
            )}
            {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {setup ? (
          <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-background-secondary p-4">
              {qrDataUrl ? (
                <Image
                  alt="Authenticator QR code"
                  className="h-48 w-48 rounded-md bg-white p-2"
                  height={192}
                  src={qrDataUrl}
                  unoptimized
                  width={192}
                />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded-md border border-border">
                  <QrCode className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <Button onClick={() => void copySetupUri()} size="sm" type="button" variant="outline">
                {copiedUri ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedUri ? 'Copied' : 'Copy setup URI'}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Backup codes</p>
                    <p className="text-xs text-muted-foreground">
                      Copy these now. They are only shown during setup.
                    </p>
                  </div>
                  <CopyButton
                    idleLabel="Copy codes"
                    label="Copy backup codes"
                    value={backupCodesText}
                  />
                </div>
                <div className="mt-3 grid grid-cols-5 gap-2 rounded-md bg-background-deep p-3 font-mono text-xs text-foreground">
                  {setup.backupCodes.map((backupCode, index) => (
                    <span
                      className="rounded border border-border bg-background px-2 py-1 text-center"
                      key={`${backupCode}-${index}`}
                    >
                      {backupCode}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label
                  className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                  htmlFor="mfa-setup-code"
                >
                  Authenticator code
                </label>
                <Input
                  id="mfa-setup-code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  className={cn(
                    'h-11 text-center font-mono text-base tracking-[0.4em]',
                    fieldErrors.setupCode && 'border-danger focus-visible:ring-danger'
                  )}
                  value={setupCode}
                  onChange={(event) => {
                    setSetupCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    setFieldErrors((current) => ({ ...current, setupCode: '' }))
                  }}
                  placeholder="000000"
                />
                <p
                  className={cn(
                    'min-h-5 text-sm',
                    fieldErrors.setupCode ? 'text-danger' : 'text-muted-foreground'
                  )}
                >
                  {fieldErrors.setupCode ?? '\u00A0'}
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSetup(null)
                    setSetupCode('')
                    setFieldErrors({})
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={isVerifyingSetup}
                  onClick={() => void handleVerifySetup()}
                  type="button"
                >
                  {isVerifyingSetup ? 'Verifying...' : 'Verify and enable'}
                </Button>
              </div>
            </div>
          </div>
        ) : user?.twoFactorEnabled ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You will be asked for an authenticator code when signing in on new devices.
            </p>

            {!enabledAction ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  className="gap-2"
                  onClick={() => resetActionState('change')}
                  type="button"
                  variant="outline"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Change MFA
                </Button>
                <Button onClick={() => resetActionState('disable')} type="button" variant="danger">
                  Disable MFA
                </Button>
              </div>
            ) : (
              <div className="space-y-4 rounded-lg border border-border bg-background-secondary p-4">
                {enabledAction === 'change' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={verificationMethod === 'totp' ? 'default' : 'outline'}
                      onClick={() => {
                        setVerificationMethod('totp')
                        setFieldErrors({})
                      }}
                    >
                      Use current MFA code
                    </Button>
                    <Button
                      type="button"
                      variant={verificationMethod === 'recovery' ? 'default' : 'outline'}
                      onClick={() => {
                        setVerificationMethod('recovery')
                        setFieldErrors({})
                      }}
                    >
                      Use recovery code
                    </Button>
                  </div>
                ) : null}

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px_auto] lg:items-start">
                  <div className="grid gap-1 lg:grid-rows-[auto_44px_20px]">
                    <label
                      className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                      htmlFor="mfa-password"
                    >
                      Current password
                    </label>
                    <PasswordInput
                      id="mfa-password"
                      autoComplete="current-password"
                      className={cn(
                        'h-11',
                        fieldErrors.password && 'border-danger focus-visible:ring-danger'
                      )}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        setFieldErrors((current) => ({ ...current, password: '' }))
                      }}
                      placeholder="Enter your password"
                    />
                    <p
                      className={cn(
                        'min-h-5 text-sm',
                        fieldErrors.password ? 'text-danger' : 'text-muted-foreground'
                      )}
                    >
                      {fieldErrors.password ?? '\u00A0'}
                    </p>
                  </div>

                  {enabledAction === 'change' && verificationMethod === 'recovery' ? (
                    <RecoveryCodeInputs
                      value={recoveryCode}
                      onChange={setRecoveryCode}
                      error={fieldErrors.recoveryCode}
                      idPrefix="mfa-change-recovery"
                    />
                  ) : (
                    <div className="grid gap-1 lg:grid-rows-[auto_44px_20px]">
                      <label
                        className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                        htmlFor="mfa-current-code"
                      >
                        Authenticator code
                      </label>
                      <Input
                        id="mfa-current-code"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        maxLength={6}
                        className={cn(
                          'h-11 text-center font-mono text-base tracking-[0.4em]',
                          fieldErrors.code && 'border-danger focus-visible:ring-danger'
                        )}
                        value={totpCode}
                        onChange={(event) => {
                          setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                          setFieldErrors((current) => ({ ...current, code: '' }))
                        }}
                        placeholder="000000"
                      />
                      <p
                        className={cn(
                          'min-h-5 text-sm',
                          fieldErrors.code ? 'text-danger' : 'text-muted-foreground'
                        )}
                      >
                        {fieldErrors.code ?? '\u00A0'}
                      </p>
                    </div>
                  )}

                  <div className="grid gap-1 lg:grid-rows-[auto_44px_20px]">
                    <span className="text-xs font-mono uppercase tracking-[0.12em] text-transparent">
                      Action
                    </span>
                    <Button
                      className="h-11 px-5"
                      type="button"
                      variant={enabledAction === 'disable' ? 'danger' : 'default'}
                      disabled={isSubmittingAction}
                      onClick={() => void handleStartChangeOrDisable()}
                    >
                      {isSubmittingAction
                        ? enabledAction === 'disable'
                          ? 'Disabling...'
                          : 'Starting...'
                        : enabledAction === 'disable'
                          ? 'Disable MFA'
                          : 'Change MFA'}
                    </Button>
                    <span className="min-h-5 text-sm text-transparent">{'\u00A0'}</span>
                  </div>
                </div>

                <button
                  className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  onClick={() => resetActionState()}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter your current password to generate a QR code for your authenticator app.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex-1 space-y-1">
                <label
                  className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                  htmlFor="enable-mfa-password"
                >
                  Current password
                </label>
                <PasswordInput
                  id="enable-mfa-password"
                  autoComplete="current-password"
                  className={cn(fieldErrors.password && 'border-danger focus-visible:ring-danger')}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setFieldErrors((current) => ({ ...current, password: '' }))
                  }}
                  placeholder="Enter your password"
                />
                <p
                  className={cn(
                    'min-h-5 text-sm',
                    fieldErrors.password ? 'text-danger' : 'text-muted-foreground'
                  )}
                >
                  {fieldErrors.password ?? '\u00A0'}
                </p>
              </div>
              <Button
                className="mt-0 gap-2 sm:mt-6"
                disabled={isStartingSetup}
                onClick={() => void handleStartFreshSetup()}
                type="button"
              >
                <KeyRound className="h-4 w-4" />
                {isStartingSetup ? 'Starting...' : 'Set up MFA'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
