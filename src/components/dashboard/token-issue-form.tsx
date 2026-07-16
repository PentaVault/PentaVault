'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SECRET_MODES } from '@/lib/constants'
import { useToast } from '@/lib/hooks/use-toast'
import { useTokens } from '@/lib/hooks/use-tokens'
import type { SecretMode } from '@/lib/types/models'
import { cn } from '@/lib/utils/cn'
import { getApiFieldErrors, getApiFriendlyMessageWithRef } from '@/lib/utils/errors'

type TokenIssueFormProps = {
  onIssued?: (payload: {
    token: string
    tokenStart: string
    expiresAt: string
    mode: SecretMode
  }) => void
}

export function TokenIssueForm({ onIssued }: TokenIssueFormProps) {
  const tokens = useTokens()
  const { toast } = useToast()

  const [secretId, setSecretId] = useState('')
  const [mode, setMode] = useState<SecretMode>('compatibility')
  const [expiresAt, setExpiresAt] = useState('')
  const [allowedIps, setAllowedIps] = useState('')
  const [deviceFingerprint, setDeviceFingerprint] = useState('')
  const [maxRequestsPerSecond, setMaxRequestsPerSecond] = useState('')
  const [maxRequestsTotal, setMaxRequestsTotal] = useState('')
  const [ttlSeconds, setTtlSeconds] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})

    const normalizedSecretId = secretId.trim()
    const normalizedExpiresAt = expiresAt.trim()
    const normalizedIps = allowedIps
      .split(/[\s,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
    const normalizedDeviceFingerprint = deviceFingerprint.trim()

    function optionalPositiveInteger(value: string, field: string, min: number, max: number) {
      if (!value.trim()) return undefined
      const parsed = Number(value)
      if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        setFieldErrors({ [field]: `Enter a whole number between ${min} and ${max}.` })
        return null
      }
      return parsed
    }

    if (!normalizedSecretId) {
      setFieldErrors({ secretId: 'Please enter the secret ID you want to issue a token for.' })
      return
    }

    if (normalizedExpiresAt && Number.isNaN(Date.parse(normalizedExpiresAt))) {
      setFieldErrors({ expiresAt: 'Please enter a valid future ISO timestamp.' })
      return
    }

    if (normalizedIps.length > 32) {
      setFieldErrors({ allowedIps: 'Add no more than 32 exact IPv4 or IPv6 addresses.' })
      return
    }

    if (normalizedDeviceFingerprint && normalizedDeviceFingerprint.length < 8) {
      setFieldErrors({
        deviceFingerprint: 'Device fingerprints must contain at least 8 characters.',
      })
      return
    }

    const normalizedRps = optionalPositiveInteger(
      maxRequestsPerSecond,
      'maxRequestsPerSecond',
      1,
      10_000
    )
    if (normalizedRps === null) return
    const normalizedTotal = optionalPositiveInteger(
      maxRequestsTotal,
      'maxRequestsTotal',
      1,
      1_000_000_000
    )
    if (normalizedTotal === null) return
    const normalizedTtl = optionalPositiveInteger(ttlSeconds, 'ttlSeconds', 60, 31_536_000)
    if (normalizedTtl === null) return

    try {
      const result = await tokens.issueToken.mutateAsync({
        secretId: normalizedSecretId,
        mode,
        ...(normalizedExpiresAt ? { expiresAt: normalizedExpiresAt } : {}),
        ...(normalizedIps.length > 0 ? { allowedIps: normalizedIps } : {}),
        ...(normalizedDeviceFingerprint ? { deviceFingerprint: normalizedDeviceFingerprint } : {}),
        ...(normalizedRps ? { maxRequestsPerSecond: normalizedRps } : {}),
        ...(normalizedTotal ? { maxRequestsTotal: normalizedTotal } : {}),
        ...(normalizedTtl ? { ttlSeconds: normalizedTtl } : {}),
      })

      toast.success('Token issued successfully.')
      onIssued?.({
        token: result.token,
        tokenStart: result.tokenStart,
        expiresAt: result.expiresAt,
        mode: result.mode,
      })
      setSecretId('')
      setExpiresAt('')
      setAllowedIps('')
      setDeviceFingerprint('')
      setMaxRequestsPerSecond('')
      setMaxRequestsTotal('')
      setTtlSeconds('')
    } catch (submitError) {
      const fields = getApiFieldErrors(submitError)
      if (fields && Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        return
      }

      const message = getApiFriendlyMessageWithRef(
        submitError,
        'Unable to issue this token right now.'
      )
      toast.error(message)
    }
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
      <div className="space-y-1">
        <label
          className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
          htmlFor="token-secret-id"
        >
          Secret ID
        </label>
        <Input
          className={cn(fieldErrors.secretId && 'border-danger focus-visible:ring-danger')}
          id="token-secret-id"
          onChange={(event) => {
            setSecretId(event.target.value)
            setFieldErrors((current) => ({ ...current, secretId: '' }))
          }}
          placeholder="secret_xxxxx"
          value={secretId}
        />
        {fieldErrors.secretId ? (
          <p className="text-sm text-danger">{fieldErrors.secretId}</p>
        ) : null}
      </div>

      <fieldset className="rounded-lg border border-border p-3">
        <legend className="px-1 text-xs font-mono tracking-[0.12em] text-muted-foreground uppercase">
          Token policy (optional)
        </legend>
        <p className="mb-3 text-xs text-muted-foreground">
          Bind this token to exact clients and cap its usable lifetime or request volume.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground" htmlFor="token-allowed-ips">
              Allowed IP addresses
            </label>
            <Input
              id="token-allowed-ips"
              onChange={(event) => setAllowedIps(event.target.value)}
              placeholder="203.0.113.10, 2001:db8::10"
              value={allowedIps}
            />
            {fieldErrors.allowedIps ? (
              <p className="text-sm text-danger">{fieldErrors.allowedIps}</p>
            ) : null}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground" htmlFor="token-device-fingerprint">
              Device fingerprint
            </label>
            <Input
              id="token-device-fingerprint"
              onChange={(event) => setDeviceFingerprint(event.target.value)}
              placeholder="device:production-runner"
              value={deviceFingerprint}
            />
            {fieldErrors.deviceFingerprint ? (
              <p className="text-sm text-danger">{fieldErrors.deviceFingerprint}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="token-max-rps">
              Requests per second
            </label>
            <Input
              id="token-max-rps"
              inputMode="numeric"
              onChange={(event) => setMaxRequestsPerSecond(event.target.value)}
              placeholder="10"
              value={maxRequestsPerSecond}
            />
            {fieldErrors.maxRequestsPerSecond ? (
              <p className="text-sm text-danger">{fieldErrors.maxRequestsPerSecond}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="token-max-total">
              Total requests
            </label>
            <Input
              id="token-max-total"
              inputMode="numeric"
              onChange={(event) => setMaxRequestsTotal(event.target.value)}
              placeholder="1000"
              value={maxRequestsTotal}
            />
            {fieldErrors.maxRequestsTotal ? (
              <p className="text-sm text-danger">{fieldErrors.maxRequestsTotal}</p>
            ) : null}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground" htmlFor="token-ttl-seconds">
              Maximum lifetime in seconds
            </label>
            <Input
              id="token-ttl-seconds"
              inputMode="numeric"
              onChange={(event) => setTtlSeconds(event.target.value)}
              placeholder="3600"
              value={ttlSeconds}
            />
            {fieldErrors.ttlSeconds ? (
              <p className="text-sm text-danger">{fieldErrors.ttlSeconds}</p>
            ) : null}
          </div>
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor="token-mode"
          >
            Mode
          </label>
          <Select onValueChange={(value) => setMode(value as SecretMode)} value={mode}>
            <SelectTrigger aria-label="Token mode" id="token-mode">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {SECRET_MODES.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {entry}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor="token-expires-at"
          >
            Expires at (optional ISO timestamp)
          </label>
          <Input
            className={cn(fieldErrors.expiresAt && 'border-danger focus-visible:ring-danger')}
            id="token-expires-at"
            onChange={(event) => {
              setExpiresAt(event.target.value)
              setFieldErrors((current) => ({ ...current, expiresAt: '' }))
            }}
            placeholder="2026-12-31T23:59:59.000Z"
            value={expiresAt}
          />
          {fieldErrors.expiresAt ? (
            <p className="text-sm text-danger">{fieldErrors.expiresAt}</p>
          ) : null}
        </div>
      </div>

      <Button disabled={tokens.issueToken.isPending} type="submit">
        {tokens.issueToken.isPending ? 'Issuing...' : 'Issue token'}
      </Button>

      <p className="text-xs text-muted-foreground">
        Use `compatibility` for `/resolve-bulk` workflows and `gateway` for provider proxy requests.
      </p>
    </form>
  )
}
