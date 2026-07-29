'use client'

import { KeyRound, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  useCreateSsoConnection,
  useDeleteSsoConnection,
  useSsoConnections,
  useUpdateSsoConnection,
  useVerifySsoConnection,
} from '@/lib/hooks/use-sso'
import { useToast } from '@/lib/hooks/use-toast'
import type { CreateSsoConnectionInput, SsoConnection, SsoProviderType } from '@/lib/types/api'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type ConnectionDraft = {
  provider: SsoProviderType
  label: string
  issuer: string
  jwksUri: string
  clientId: string
  authorizationEndpoint: string
  tokenEndpoint: string
  entryPoint: string
  idpCert: string
  spEntityId: string
  allowedEmailDomains: string
  justInTimeProvisioning: boolean
}

const EMPTY_DRAFT: ConnectionDraft = {
  provider: 'oidc',
  label: '',
  issuer: '',
  jwksUri: '',
  clientId: '',
  authorizationEndpoint: '',
  tokenEndpoint: '',
  entryPoint: '',
  idpCert: '',
  spEntityId: '',
  allowedEmailDomains: '',
  justInTimeProvisioning: false,
}

/** The endpoint an admin most likely wants to see at a glance, per protocol. */
function primaryEndpoint(connection: SsoConnection): string {
  return connection.provider === 'saml' ? connection.entryPoint : connection.issuer
}

function parseDomains(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((domain) => domain.trim().replace(/^@/, '').toLowerCase())
    .filter((domain) => domain.length > 0)
}

function ConnectionRow({ connection }: { connection: SsoConnection }) {
  const { toast } = useToast()
  const updateConnection = useUpdateSsoConnection()
  const deleteConnection = useDeleteSsoConnection()
  const verifyConnection = useVerifySsoConnection()
  const [idToken, setIdToken] = useState('')
  const [nonce, setNonce] = useState('')
  const [testOpen, setTestOpen] = useState(false)

  async function toggleEnabled(): Promise<void> {
    try {
      await updateConnection.mutateAsync({
        connectionId: connection.id,
        input: { enabled: !connection.enabled },
      })
      toast.success(connection.enabled ? 'Connection disabled.' : 'Connection enabled.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update this connection right now.'))
    }
  }

  async function toggleProvisioning(): Promise<void> {
    try {
      await updateConnection.mutateAsync({
        connectionId: connection.id,
        input: { justInTimeProvisioning: !connection.justInTimeProvisioning },
      })
      toast.success(
        connection.justInTimeProvisioning
          ? 'New users must now be invited before they can sign in.'
          : 'New users from an allowed domain will be created on first sign-in.'
      )
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update this connection right now.'))
    }
  }

  async function handleDelete(): Promise<void> {
    try {
      await deleteConnection.mutateAsync(connection.id)
      toast.success('Connection removed.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to remove this connection right now.'))
    }
  }

  async function handleVerify(): Promise<void> {
    if (!idToken.trim() || !nonce.trim()) {
      toast.error('Both an ID token and the nonce it was issued with are required.')
      return
    }

    try {
      const result = await verifyConnection.mutateAsync({
        connectionId: connection.id,
        idToken: idToken.trim(),
        nonce: nonce.trim(),
      })
      toast.success(
        result.decision.shouldProvision
          ? `Accepted for ${result.decision.email} — a new account would be created.`
          : `Accepted for ${result.decision.email}.`
      )
      setIdToken('')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'The identity provider assertion was refused.'))
    }
  }

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{connection.label}</span>
            <Badge className="border border-border text-muted-foreground">
              {connection.provider}
            </Badge>
            <Badge
              className={cn(
                'border',
                connection.enabled
                  ? 'border-accent/40 bg-accent-muted text-accent-strong'
                  : 'border-border text-muted-foreground'
              )}
            >
              {connection.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
            {connection.justInTimeProvisioning ? (
              <Badge className="border border-warning/40 bg-warning-muted text-warning">
                Auto-provisioning
              </Badge>
            ) : null}
          </div>

          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
            {primaryEndpoint(connection)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Accepts{' '}
            {connection.allowedEmailDomains.map((domain) => `@${domain}`).join(', ') ||
              'no domains'}
          </p>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <Button
            disabled={updateConnection.isPending}
            onClick={() => void toggleProvisioning()}
            size="sm"
            type="button"
            variant="outline"
          >
            {connection.justInTimeProvisioning ? 'Require invite' : 'Auto-provision'}
          </Button>
          <Button
            onClick={() => setTestOpen((open) => !open)}
            size="sm"
            type="button"
            variant="outline"
          >
            Test
          </Button>
          <Button
            disabled={updateConnection.isPending}
            onClick={() => void toggleEnabled()}
            size="sm"
            type="button"
            variant={connection.enabled ? 'outline' : 'default'}
          >
            {connection.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            aria-label={`Remove connection ${connection.label}`}
            disabled={deleteConnection.isPending}
            onClick={() => void handleDelete()}
            size="sm"
            type="button"
            variant="outline"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {testOpen ? (
        <div className="mt-3 space-y-2 rounded-md border border-border bg-surface-muted p-3">
          <p className="text-xs text-muted-foreground">
            Paste an ID token issued by this provider and the nonce it was requested with.
            PentaVault reports whether the assertion would be accepted. No session is created.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[240px] flex-1 space-y-1">
              <label
                className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                htmlFor={`sso-id-token-${connection.id}`}
              >
                ID token
              </label>
              <Input
                id={`sso-id-token-${connection.id}`}
                onChange={(event) => setIdToken(event.target.value)}
                placeholder="eyJhbGciOiJSUzI1NiIs..."
                value={idToken}
              />
            </div>
            <div className="min-w-[160px] space-y-1">
              <label
                className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                htmlFor={`sso-nonce-${connection.id}`}
              >
                Nonce
              </label>
              <Input
                id={`sso-nonce-${connection.id}`}
                onChange={(event) => setNonce(event.target.value)}
                value={nonce}
              />
            </div>
            <Button
              disabled={verifyConnection.isPending}
              onClick={() => void handleVerify()}
              size="sm"
              type="button"
            >
              {verifyConnection.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              Verify
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function OrganizationSso() {
  const { toast } = useToast()
  const { data, isPending, isError } = useSsoConnections()
  const createConnection = useCreateSsoConnection()
  const [draft, setDraft] = useState<ConnectionDraft>(EMPTY_DRAFT)

  function updateDraft(changes: Partial<ConnectionDraft>): void {
    setDraft((current) => ({ ...current, ...changes }))
  }

  async function handleCreate(): Promise<void> {
    const allowedEmailDomains = parseDomains(draft.allowedEmailDomains)
    if (allowedEmailDomains.length === 0) {
      // Mirrors the backend rule: without a domain the connection would admit
      // every user of the identity provider.
      toast.error('At least one allowed email domain is required.')
      return
    }

    const shared = {
      label: draft.label.trim(),
      allowedEmailDomains,
      justInTimeProvisioning: draft.justInTimeProvisioning,
    }

    const input: CreateSsoConnectionInput =
      draft.provider === 'saml'
        ? {
            ...shared,
            provider: 'saml',
            entryPoint: draft.entryPoint.trim(),
            idpCert: draft.idpCert.trim(),
            spEntityId: draft.spEntityId.trim(),
          }
        : {
            ...shared,
            provider: 'oidc',
            issuer: draft.issuer.trim(),
            jwksUri: draft.jwksUri.trim(),
            clientId: draft.clientId.trim(),
            authorizationEndpoint: draft.authorizationEndpoint.trim(),
            tokenEndpoint: draft.tokenEndpoint.trim(),
          }

    try {
      await createConnection.mutateAsync(input)
      setDraft(EMPTY_DRAFT)
      toast.success('SSO connection added.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to add this connection right now.'))
    }
  }

  const connections = data?.connections ?? []

  const oidcFields: Array<{ key: keyof ConnectionDraft; label: string; placeholder: string }> = [
    { key: 'issuer', label: 'Issuer', placeholder: 'https://acme.okta.com' },
    { key: 'jwksUri', label: 'JWKS URI', placeholder: 'https://acme.okta.com/oauth2/v1/keys' },
    { key: 'clientId', label: 'Client ID', placeholder: '0oa1b2c3d4' },
    {
      key: 'authorizationEndpoint',
      label: 'Authorization endpoint',
      placeholder: 'https://acme.okta.com/oauth2/v1/authorize',
    },
    {
      key: 'tokenEndpoint',
      label: 'Token endpoint',
      placeholder: 'https://acme.okta.com/oauth2/v1/token',
    },
  ]

  const samlFields: Array<{ key: keyof ConnectionDraft; label: string; placeholder: string }> = [
    {
      key: 'entryPoint',
      label: 'Sign-on URL',
      placeholder: 'https://acme.okta.com/app/acme/sso/saml',
    },
    { key: 'spEntityId', label: 'Service provider entity ID', placeholder: 'https://acme.com/sp' },
    {
      key: 'idpCert',
      label: 'IdP signing certificate',
      placeholder: '-----BEGIN CERTIFICATE-----',
    },
  ]

  const fields: Array<{ key: keyof ConnectionDraft; label: string; placeholder: string }> = [
    { key: 'label', label: 'Name', placeholder: 'Acme Okta' },
    ...(draft.provider === 'saml' ? samlFields : oidcFields),
    { key: 'allowedEmailDomains', label: 'Allowed email domains', placeholder: 'acme.com' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          Single sign-on
        </CardTitle>
        <CardDescription>
          Federate sign-in to your OpenID Connect provider. Every endpoint must use https, and the
          allowed email domains are what scope a connection to your company rather than to everyone
          who holds an account at the provider.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-3 border-b border-border pb-4">
          <div className="space-y-1">
            <span className="block text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
              Protocol
            </span>
            <div className="flex gap-1">
              {(['oidc', 'saml'] as const).map((option) => (
                <Button
                  key={option}
                  // Switching clears the draft: the two protocols share almost
                  // no fields, so carrying values across would submit nonsense.
                  onClick={() => setDraft({ ...EMPTY_DRAFT, provider: option })}
                  size="sm"
                  type="button"
                  variant={draft.provider === option ? 'default' : 'outline'}
                >
                  {option === 'oidc' ? 'OpenID Connect' : 'SAML'}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <div className="space-y-1" key={field.key}>
                <label
                  className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
                  htmlFor={`new-sso-${field.key}`}
                >
                  {field.label}
                </label>
                <Input
                  id={`new-sso-${field.key}`}
                  onChange={(event) => updateDraft({ [field.key]: event.target.value })}
                  placeholder={field.placeholder}
                  value={String(draft[field.key])}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                checked={draft.justInTimeProvisioning}
                onChange={(event) => updateDraft({ justInTimeProvisioning: event.target.checked })}
                type="checkbox"
              />
              Create accounts automatically on first sign-in
            </label>

            <Button
              disabled={createConnection.isPending}
              onClick={() => void handleCreate()}
              size="sm"
              type="button"
            >
              {createConnection.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add connection
            </Button>
          </div>
        </div>

        {isPending ? (
          <p className="py-6 text-sm text-muted-foreground">Loading connections...</p>
        ) : isError ? (
          <p className="py-6 text-sm text-danger">Unable to load SSO connections.</p>
        ) : connections.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No SSO connections yet. Members continue to sign in with their PentaVault credentials.
          </p>
        ) : (
          <div>
            {connections.map((connection) => (
              <ConnectionRow connection={connection} key={connection.id} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
