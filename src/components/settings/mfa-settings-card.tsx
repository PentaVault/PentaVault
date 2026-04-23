'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

import { Check, Copy, KeyRound, QrCode, ShieldCheck, ShieldOff } from 'lucide-react'
import QRCode from 'qrcode'

import { CopyButton } from '@/components/shared/copy-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { authApi } from '@/lib/api/auth'
import { useEmailCooldown } from '@/lib/hooks/use-email-cooldown'
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

type DisableFlowStep = 'idle' | 'verify'

export function MfaSettingsCard({ user, onChanged }: MfaSettingsCardProps) {
  const { toast } = useToast()
  const [password, setPassword] = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [disableEmail, setDisableEmail] = useState(user?.email ?? '')
  const [disableFlowStep, setDisableFlowStep] = useState<DisableFlowStep>('idle')
  const [code, setCode] = useState('')
  const [setup, setSetup] = useState<SetupState | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copiedUri, setCopiedUri] = useState(false)
  const [isStartingSetup, setIsStartingSetup] = useState(false)
  const [isStartingDisable, setIsStartingDisable] = useState(false)
  const [isResendingDisable, setIsResendingDisable] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const disableCooldown = useEmailCooldown()

  const backupCodesText = useMemo(() => setup?.backupCodes.join('\n') ?? '', [setup])
  const disableDestinationEmail = disableEmail || user?.email || ''
  const disablePasswordHelperText =
    fieldErrors.disablePassword ?? (disableFlowStep === 'verify' ? 'Password confirmed.' : '\u00A0')
  const disableCodeHelperText =
    fieldErrors.disableCode ?? (disableFlowStep === 'verify' ? 'Enter the 6-digit code.' : '\u00A0')

  useEffect(() => {
    let cancelled = false

    async function renderQrCode(): Promise<void> {
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
          toast.error('Unable to render the authenticator QR code. Use the setup key instead.')
        }
      }
    }

    void renderQrCode()

    return () => {
      cancelled = true
    }
  }, [setup?.totpURI, toast])

  async function handleStartSetup(): Promise<void> {
    setFieldErrors({})

    if (!password) {
      setFieldErrors({ password: 'Enter your current password to enable MFA.' })
      return
    }

    try {
      setIsStartingSetup(true)
      const response = await authApi.enableMfa({ password })
      setSetup(response)
      setCode('')
      toast.success('Authenticator setup created. Scan the QR code and enter a code to verify.')
    } catch (error) {
      const fields = getApiFieldErrors(error)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors(fields)
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

  async function handleVerifySetup(): Promise<void> {
    setFieldErrors({})

    const normalizedCode = code.trim()
    if (!normalizedCode) {
      setFieldErrors({ code: 'Enter the 6-digit code from your authenticator app.' })
      return
    }

    try {
      setIsVerifying(true)
      await authApi.verifyTotp({ code: normalizedCode })
      await onChanged()
      setPassword('')
      setCode('')
      setSetup(null)
      toast.success('Multi-factor authentication is now enabled.')
    } catch (error) {
      const payload = getApiErrorPayload(error)
      if (payload?.code === 'AUTH_MFA_CODE_INVALID') {
        setFieldErrors({ code: 'The authenticator code is invalid.' })
      }

      toast.error(
        getApiFriendlyMessageWithRef(error, 'Unable to verify this authenticator code right now.')
      )
    } finally {
      setIsVerifying(false)
    }
  }

  async function handleStartDisable(): Promise<void> {
    setFieldErrors({})

    if (!disablePassword) {
      setFieldErrors({ disablePassword: 'Enter your current password.' })
      return
    }

    try {
      setIsStartingDisable(true)
      const response = await authApi.startDisableMfa({ password: disablePassword })
      setDisableFlowStep('verify')
      setDisableEmail(response.email)
      setDisablePassword('')
      setDisableCode('')
      disableCooldown.startCooldown(60)
      toast.success('Disable code sent.')
    } catch (error) {
      const fields = getApiFieldErrors(error)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors({
          ...(fields.password ? { disablePassword: fields.password } : {}),
        })
        return
      }

      const payload = getApiErrorPayload(error)
      if (payload?.code === 'AUTH_PASSWORD_INVALID') {
        setFieldErrors({ disablePassword: 'The password you entered is incorrect.' })
      }
      if (payload?.code === 'RATE_LIMITED' && typeof payload.retryAfter === 'number') {
        disableCooldown.startCooldown(payload.retryAfter)
      }

      toast.error(getApiFriendlyMessageWithRef(error, 'Unable to send a disable code right now.'))
    } finally {
      setIsStartingDisable(false)
    }
  }

  async function handleResendDisableCode(): Promise<void> {
    if (disableCooldown.isOnCooldown || disableFlowStep !== 'verify') {
      return
    }

    try {
      setIsResendingDisable(true)
      const response = await authApi.resendDisableMfaCode()
      setDisableEmail(response.email)
      disableCooldown.startCooldown(60)
      toast.success('Disable code sent.')
    } catch (error) {
      const payload = getApiErrorPayload(error)
      if (payload?.code === 'RATE_LIMITED' && typeof payload.retryAfter === 'number') {
        disableCooldown.startCooldown(payload.retryAfter)
      }

      toast.error(getApiFriendlyMessageWithRef(error, 'Unable to resend the disable code.'))
    } finally {
      setIsResendingDisable(false)
    }
  }

  async function handleDisable(): Promise<void> {
    setFieldErrors({})

    if (disableFlowStep === 'idle') {
      await handleStartDisable()
      return
    }

    if (disableCode.length !== 6) {
      setFieldErrors({ disableCode: 'Enter the 6-digit code.' })
      return
    }

    try {
      setIsDisabling(true)
      await authApi.confirmDisableMfa({ code: disableCode })
      await onChanged()
      setDisableFlowStep('idle')
      setDisableCode('')
      setDisablePassword('')
      setDisableEmail(user?.email ?? '')
      toast.success('Multi-factor authentication has been disabled.')
    } catch (error) {
      const fields = getApiFieldErrors(error)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors({
          ...(fields.code ? { disableCode: fields.code } : {}),
        })
        return
      }

      const payload = getApiErrorPayload(error)
      if (payload?.code === 'AUTH_MFA_DISABLE_CODE_INVALID') {
        setFieldErrors({ disableCode: 'The email code is invalid.' })
      }
      if (payload?.code === 'RATE_LIMITED' && typeof payload.retryAfter === 'number') {
        disableCooldown.startCooldown(payload.retryAfter)
      }

      toast.error(getApiFriendlyMessageWithRef(error, 'Unable to disable MFA right now.'))
    } finally {
      setIsDisabling(false)
    }
  }

  async function copySetupUri(): Promise<void> {
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
        {user?.twoFactorEnabled ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You will be asked for an authenticator code when signing in on new devices.
            </p>
            <div className="min-h-5 text-xs text-muted-foreground">
              {disableFlowStep === 'verify'
                ? `Code sent to ${disableDestinationEmail}.`
                : 'Enter your current password to get a disable code by email.'}
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-start">
              <div className="grid gap-1 lg:grid-rows-[auto_44px_20px]">
                <label
                  className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                  htmlFor="disable-mfa-password"
                >
                  Current password
                </label>
                {disableFlowStep === 'verify' ? (
                  <Input
                    className="h-11 cursor-not-allowed bg-card-elevated text-muted-foreground"
                    disabled
                    id="disable-mfa-password"
                    placeholder="Password confirmed"
                    value=""
                  />
                ) : (
                  <PasswordInput
                    autoComplete="current-password"
                    className={cn(
                      'h-11',
                      fieldErrors.disablePassword && 'border-danger focus-visible:ring-danger'
                    )}
                    id="disable-mfa-password"
                    onChange={(event) => {
                      setDisablePassword(event.target.value)
                      setFieldErrors((current) => ({ ...current, disablePassword: '' }))
                    }}
                    placeholder="Enter your password"
                    value={disablePassword}
                  />
                )}
                <p
                  className={cn(
                    'min-h-5 text-sm',
                    fieldErrors.disablePassword ? 'text-danger' : 'text-muted-foreground'
                  )}
                >
                  {disablePasswordHelperText}
                </p>
              </div>

              <div className="grid gap-1 lg:grid-rows-[auto_44px_20px]">
                <label
                  className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                  htmlFor="disable-mfa-code"
                >
                  Email code
                </label>
                <Input
                  autoComplete="one-time-code"
                  className={cn(
                    'h-11 text-center font-mono text-base tracking-[0.4em]',
                    fieldErrors.disableCode && 'border-danger focus-visible:ring-danger'
                  )}
                  disabled={disableFlowStep !== 'verify'}
                  id="disable-mfa-code"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => {
                    setDisableCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    setFieldErrors((current) => ({ ...current, disableCode: '' }))
                  }}
                  placeholder="000000"
                  value={disableCode}
                />
                <p
                  className={cn(
                    'min-h-5 text-sm',
                    fieldErrors.disableCode ? 'text-danger' : 'text-muted-foreground'
                  )}
                >
                  {disableCodeHelperText}
                </p>
              </div>

              <div className="grid gap-1 lg:grid-rows-[auto_44px_20px]">
                <span className="text-xs font-mono uppercase tracking-[0.12em] text-transparent">
                  Action
                </span>
                <Button
                  className="h-11 px-5"
                  disabled={isStartingDisable || isDisabling}
                  onClick={() => void handleDisable()}
                  type="button"
                  variant="danger"
                >
                  {disableFlowStep === 'verify'
                    ? isDisabling
                      ? 'Disabling...'
                      : 'Disable MFA'
                    : isStartingDisable
                      ? 'Sending...'
                      : 'Send code'}
                </Button>
                <span aria-hidden="true" className="min-h-5 text-sm text-transparent">
                  {'\u00A0'}
                </span>
              </div>
            </div>
            <div className="min-h-5">
              {disableFlowStep === 'verify' ? (
                <button
                  className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isResendingDisable || disableCooldown.isOnCooldown}
                  onClick={() => void handleResendDisableCode()}
                  type="button"
                >
                  {disableCooldown.isOnCooldown
                    ? `Resend in ${disableCooldown.secondsLeft}s`
                    : isResendingDisable
                      ? 'Sending...'
                      : 'Resend code'}
                </button>
              ) : null}
            </div>
          </div>
        ) : setup ? (
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
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-background-deep p-3 font-mono text-xs text-foreground sm:grid-cols-5">
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
                  autoComplete="one-time-code"
                  className={cn(
                    'h-11 text-center font-mono text-base tracking-[0.4em]',
                    fieldErrors.code && 'border-danger focus-visible:ring-danger'
                  )}
                  id="mfa-setup-code"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    setFieldErrors((current) => ({ ...current, code: '' }))
                  }}
                  placeholder="000000"
                  value={code}
                />
                {fieldErrors.code ? (
                  <p className="text-sm text-danger">{fieldErrors.code}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  onClick={() => {
                    setSetup(null)
                    setCode('')
                    setFieldErrors({})
                  }}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isVerifying}
                  onClick={() => void handleVerifySetup()}
                  type="button"
                >
                  {isVerifying ? 'Verifying...' : 'Verify and enable'}
                </Button>
              </div>
            </div>
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
                  autoComplete="current-password"
                  className={cn(fieldErrors.password && 'border-danger focus-visible:ring-danger')}
                  id="enable-mfa-password"
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setFieldErrors((current) => ({ ...current, password: '' }))
                  }}
                  placeholder="Enter your password"
                  value={password}
                />
                {fieldErrors.password ? (
                  <p className="text-sm text-danger">{fieldErrors.password}</p>
                ) : null}
              </div>
              <Button
                className="mt-0 gap-2 sm:mt-6"
                disabled={isStartingSetup}
                onClick={() => void handleStartSetup()}
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
