'use client'

import { Bot, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCreateMachineIdentity,
  useCreateMachineIdentityAuthMethod,
  useDeleteMachineIdentity,
  useDeleteMachineIdentityAuthMethod,
  useGrantMachineIdentityProject,
  useMachineIdentities,
  useMachineIdentityAuthMethods,
  useMachineIdentityProjectGrants,
  useRevokeMachineIdentityProject,
  useSetMachineIdentityAuthMethodEnabled,
  useUpdateMachineIdentity,
} from '@/lib/hooks/use-machine-identities'
import { useProjectsQuery } from '@/lib/hooks/use-projects'
import { useToast } from '@/lib/hooks/use-toast'
import type {
  MachineIdentity,
  MachineIdentityAuthMethod,
  MachineIdentityAuthMethodType,
  MachineIdentityGrantRole,
} from '@/lib/types/api'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

const METHOD_LABELS: Record<MachineIdentityAuthMethodType, string> = {
  oidc: 'OIDC / JWT',
  'aws-iam': 'AWS IAM',
  'gcp-iam': 'Google Cloud',
  azure: 'Azure',
  kubernetes: 'Kubernetes',
}

const METHOD_HINTS: Record<MachineIdentityAuthMethodType, string> = {
  oidc: 'Any issuer that publishes a JWKS — GitHub Actions, GitLab CI, an in-house provider.',
  'aws-iam':
    'The workload signs an sts:GetCallerIdentity request with the role it already has. No key is stored anywhere.',
  'gcp-iam':
    'An identity token from the metadata server. The service account email is what is trusted, not the numeric subject.',
  azure: 'A managed identity token from the instance metadata service, pinned to one Entra tenant.',
  kubernetes:
    'A projected service-account token, verified against the cluster’s public OIDC issuer.',
}

/** Text field definition for one method type. `list` fields accept commas or newlines. */
type FieldSpec = {
  key: string
  label: string
  placeholder: string
  list?: boolean
  required?: boolean
  hint?: string
}

const METHOD_FIELDS: Record<MachineIdentityAuthMethodType, FieldSpec[]> = {
  oidc: [
    {
      key: 'issuer',
      label: 'Issuer',
      placeholder: 'https://token.actions.githubusercontent.com',
      required: true,
    },
    {
      key: 'jwksUri',
      label: 'JWKS URI',
      placeholder: 'https://token.actions.githubusercontent.com/.well-known/jwks',
      required: true,
    },
    { key: 'audience', label: 'Audience', placeholder: 'https://pentavault.dev', required: true },
    {
      key: 'allowedSubjects',
      label: 'Allowed subjects',
      placeholder: 'repo:acme/api:ref:refs/heads/main',
      list: true,
      hint: 'Required unless the issuer is narrowed some other way.',
    },
  ],
  'aws-iam': [
    {
      key: 'audience',
      label: 'Audience',
      placeholder: 'pentavault',
      required: true,
      hint: 'The caller signs this into an x-pentavault-audience header, which is what stops a signature made elsewhere being replayed here.',
    },
    {
      key: 'allowedAccountIds',
      label: 'Allowed account ids',
      placeholder: '123456789012',
      list: true,
      required: true,
    },
    {
      key: 'allowedPrincipalArns',
      label: 'Allowed principal ARNs',
      placeholder: 'arn:aws:iam::123456789012:role/deploy-*',
      list: true,
      hint: 'Optional. Matches the role ARN as well as the assumed-role session ARN.',
    },
    {
      key: 'stsRegion',
      label: 'STS region',
      placeholder: 'eu-west-1',
      hint: 'Leave blank to use the global endpoint.',
    },
  ],
  'gcp-iam': [
    {
      key: 'audience',
      label: 'Audience',
      placeholder: 'https://pentavault.dev',
      required: true,
    },
    {
      key: 'allowedServiceAccountEmails',
      label: 'Allowed service accounts',
      placeholder: 'deployer@acme.iam.gserviceaccount.com',
      list: true,
      required: true,
    },
    {
      key: 'allowedProjectIds',
      label: 'Allowed project ids',
      placeholder: 'acme-prod',
      list: true,
      hint: 'Optional. Requires a full-format metadata token, which ties the login to a machine.',
    },
  ],
  azure: [
    {
      key: 'tenantId',
      label: 'Tenant id',
      placeholder: '00000000-0000-0000-0000-000000000000',
      required: true,
    },
    { key: 'audience', label: 'Audience', placeholder: 'api://pentavault', required: true },
    {
      key: 'allowedObjectIds',
      label: 'Allowed object ids',
      placeholder: '00000000-0000-0000-0000-000000000000',
      list: true,
    },
    {
      key: 'allowedApplicationIds',
      label: 'Allowed application ids',
      placeholder: '00000000-0000-0000-0000-000000000000',
      list: true,
      hint: 'At least one object id or application id is required.',
    },
  ],
  kubernetes: [
    {
      key: 'issuer',
      label: 'Cluster issuer',
      placeholder: 'https://oidc.eks.eu-west-1.amazonaws.com/id/EXAMPLE',
      required: true,
    },
    {
      key: 'jwksUri',
      label: 'JWKS URI',
      placeholder: 'https://oidc.eks.eu-west-1.amazonaws.com/id/EXAMPLE/keys',
      required: true,
    },
    { key: 'audience', label: 'Audience', placeholder: 'pentavault', required: true },
    {
      key: 'allowedNamespaces',
      label: 'Allowed namespaces',
      placeholder: 'payments',
      list: true,
      required: true,
    },
    {
      key: 'allowedServiceAccountNames',
      label: 'Allowed service accounts',
      placeholder: 'api',
      list: true,
      hint: 'Optional, but worth setting — every pod gets the `default` account whether it asks or not.',
    },
  ],
}

function splitList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/** One line describing what an existing method actually trusts. */
function describeAuthMethod(method: MachineIdentityAuthMethod): string {
  // Each method type has its own config shape and only the server validates
  // them, so this reads the stored object generically rather than narrowing.
  const config = method.config as unknown as Record<string, unknown>
  const list = (key: string): string[] =>
    Array.isArray(config[key]) ? (config[key] as string[]) : []

  switch (method.type) {
    case 'aws-iam':
      return [`accounts ${list('allowedAccountIds').join(', ')}`, ...list('allowedPrincipalArns')]
        .filter(Boolean)
        .join(' · ')
    case 'gcp-iam':
      return list('allowedServiceAccountEmails').join(', ')
    case 'azure':
      return [
        `tenant ${String(config.tenantId ?? '')}`,
        ...list('allowedObjectIds'),
        ...list('allowedApplicationIds'),
      ]
        .filter(Boolean)
        .join(' · ')
    case 'kubernetes':
      return [
        `namespaces ${list('allowedNamespaces').join(', ')}`,
        ...list('allowedServiceAccountNames'),
      ]
        .filter(Boolean)
        .join(' · ')
    default:
      return String(config.issuer ?? '')
  }
}

function AddAuthMethodForm({ identityId }: { identityId: string }) {
  const { toast } = useToast()
  const createAuthMethod = useCreateMachineIdentityAuthMethod()
  const [type, setType] = useState<MachineIdentityAuthMethodType>('aws-iam')
  const [values, setValues] = useState<Record<string, string>>({})

  const fields = METHOD_FIELDS[type]

  function setField(key: string, value: string): void {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(): Promise<void> {
    const config: Record<string, unknown> = {}
    for (const field of fields) {
      const raw = (values[field.key] ?? '').trim()
      if (!raw) {
        if (field.required) {
          toast.error(`${field.label} is required.`)
          return
        }
        continue
      }
      config[field.key] = field.list ? splitList(raw) : raw
    }

    // The generic method has no fixed claim shape, so a subject allowlist is
    // the only narrowing this form offers; the server insists on one.
    if (type === 'oidc') {
      config.requiredClaims = {}
    }

    try {
      await createAuthMethod.mutateAsync({ identityId, input: { type, config } as never })
      setValues({})
      toast.success(`${METHOD_LABELS[type]} authentication added.`)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to add this authentication method.'))
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-surface-muted p-3">
      <div className="space-y-1">
        <span className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
          Add authentication method
        </span>
        <Select
          onValueChange={(next) => setType(next as MachineIdentityAuthMethodType)}
          value={type}
        >
          <SelectTrigger aria-label="Authentication method type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(METHOD_LABELS) as MachineIdentityAuthMethodType[]).map((option) => (
              <SelectItem key={option} value={option}>
                {METHOD_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{METHOD_HINTS[type]}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div className="space-y-1" key={`${type}-${field.key}`}>
            <label
              className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor={`auth-method-${identityId}-${field.key}`}
            >
              {field.label}
              {field.required ? ' *' : ''}
            </label>
            <Input
              id={`auth-method-${identityId}-${field.key}`}
              onChange={(event) => setField(field.key, event.target.value)}
              placeholder={field.placeholder}
              value={values[field.key] ?? ''}
            />
            {field.hint ? <p className="text-[11px] text-muted-foreground">{field.hint}</p> : null}
          </div>
        ))}
      </div>

      <Button
        disabled={createAuthMethod.isPending}
        onClick={() => void handleSubmit()}
        size="sm"
        type="button"
      >
        <Plus className="h-3.5 w-3.5" />
        Add method
      </Button>
    </div>
  )
}

function AuthMethodRow({
  identityId,
  method,
}: {
  identityId: string
  method: MachineIdentityAuthMethod
}) {
  const { toast } = useToast()
  const setEnabled = useSetMachineIdentityAuthMethodEnabled()
  const deleteMethod = useDeleteMachineIdentityAuthMethod()

  async function handleToggle(): Promise<void> {
    try {
      await setEnabled.mutateAsync({
        identityId,
        authMethodId: method.id,
        enabled: !method.enabled,
      })
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update this method right now.'))
    }
  }

  async function handleDelete(): Promise<void> {
    try {
      await deleteMethod.mutateAsync({ identityId, authMethodId: method.id })
      toast.success('Authentication method removed.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to remove this method right now.'))
    }
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{METHOD_LABELS[method.type]}</span>
          <Badge
            className={cn(
              'border',
              method.enabled
                ? 'border-accent/40 bg-accent-muted text-accent-strong'
                : 'border-border text-muted-foreground'
            )}
          >
            {method.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
        <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
          {describeAuthMethod(method)}
        </p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <Button
          disabled={setEnabled.isPending}
          onClick={() => void handleToggle()}
          size="sm"
          type="button"
          variant={method.enabled ? 'outline' : 'default'}
        >
          {method.enabled ? 'Disable' : 'Enable'}
        </Button>
        <Button
          aria-label={`Remove ${METHOD_LABELS[method.type]} authentication`}
          disabled={deleteMethod.isPending}
          onClick={() => void handleDelete()}
          size="sm"
          type="button"
          variant="outline"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function ProjectGrants({ identityId }: { identityId: string }) {
  const { toast } = useToast()
  const { data } = useMachineIdentityProjectGrants(identityId)
  const projects = useProjectsQuery()
  const grantProject = useGrantMachineIdentityProject()
  const revokeProject = useRevokeMachineIdentityProject()
  const [projectId, setProjectId] = useState('')
  const [role, setRole] = useState<MachineIdentityGrantRole>('member')

  const grants = data?.grants ?? []
  const available = (projects.data?.projects ?? []).map((entry) => entry.project)
  const nameFor = (id: string): string => available.find((project) => project.id === id)?.name ?? id

  async function handleGrant(): Promise<void> {
    if (!projectId) {
      toast.error('Choose a project first.')
      return
    }
    try {
      await grantProject.mutateAsync({ identityId, projectId, role })
      setProjectId('')
      toast.success('Project access granted.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to grant project access right now.'))
    }
  }

  async function handleRevoke(grantedProjectId: string): Promise<void> {
    try {
      await revokeProject.mutateAsync({ identityId, projectId: grantedProjectId })
      // Grants are read live on every request, so this takes effect at once
      // rather than when the workload's current token expires.
      toast.success('Project access revoked.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to revoke project access right now.'))
    }
  }

  return (
    <div className="space-y-3">
      <span className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
        Project access
      </span>

      {grants.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No projects yet. Until one is granted, a successful login can read nothing.
        </p>
      ) : (
        <div className="rounded-md border border-border">
          {grants.map((grant) => (
            <div
              className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0"
              key={grant.id}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm">{nameFor(grant.projectId)}</span>
                <Badge className="border border-border text-muted-foreground">{grant.role}</Badge>
              </div>
              <Button
                aria-label={`Revoke access to ${nameFor(grant.projectId)}`}
                disabled={revokeProject.isPending}
                onClick={() => void handleRevoke(grant.projectId)}
                size="sm"
                type="button"
                variant="outline"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1 space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor={`grant-project-${identityId}`}
          >
            Project
          </label>
          <Select onValueChange={setProjectId} value={projectId}>
            <SelectTrigger aria-label="Project to grant" id={`grant-project-${identityId}`}>
              <SelectValue placeholder="Choose a project" />
            </SelectTrigger>
            <SelectContent>
              {available.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[130px] space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor={`grant-role-${identityId}`}
          >
            Role
          </label>
          <Select onValueChange={(next) => setRole(next as MachineIdentityGrantRole)} value={role}>
            <SelectTrigger aria-label="Project role" id={`grant-role-${identityId}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">member</SelectItem>
              <SelectItem value="admin">admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          disabled={grantProject.isPending}
          onClick={() => void handleGrant()}
          size="sm"
          type="button"
          variant="outline"
        >
          Grant
        </Button>
      </div>
    </div>
  )
}

function IdentityRow({ identity }: { identity: MachineIdentity }) {
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const authMethods = useMachineIdentityAuthMethods(expanded ? identity.id : null)
  const updateIdentity = useUpdateMachineIdentity()
  const deleteIdentity = useDeleteMachineIdentity()

  async function handleToggle(): Promise<void> {
    try {
      await updateIdentity.mutateAsync({
        identityId: identity.id,
        input: { enabled: !identity.enabled },
      })
      toast.success(
        identity.enabled
          ? 'Identity disabled. Every token it had issued is revoked.'
          : 'Identity enabled.'
      )
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update this identity right now.'))
    }
  }

  async function handleDelete(): Promise<void> {
    try {
      await deleteIdentity.mutateAsync(identity.id)
      toast.success('Identity deleted and its tokens revoked.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to delete this identity right now.'))
    }
  }

  const methods = authMethods.data?.authMethods ?? []

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <button
          aria-expanded={expanded}
          className="flex min-w-0 items-start gap-2 text-left"
          onClick={() => setExpanded((open) => !open)}
          type="button"
        >
          {expanded ? (
            <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{identity.name}</span>
              <Badge
                className={cn(
                  'border',
                  identity.enabled
                    ? 'border-accent/40 bg-accent-muted text-accent-strong'
                    : 'border-border text-muted-foreground'
                )}
              >
                {identity.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </span>
            {identity.description ? (
              <span className="mt-1 block text-xs text-muted-foreground">
                {identity.description}
              </span>
            ) : null}
          </span>
        </button>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            disabled={updateIdentity.isPending}
            onClick={() => void handleToggle()}
            size="sm"
            type="button"
            variant={identity.enabled ? 'outline' : 'default'}
          >
            {identity.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            aria-label={`Delete identity ${identity.name}`}
            disabled={deleteIdentity.isPending}
            onClick={() => void handleDelete()}
            size="sm"
            type="button"
            variant="outline"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-4 pl-6">
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
              Authentication methods
            </span>
            {methods.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                None yet. Without one, nothing can authenticate as this identity.
              </p>
            ) : (
              <div className="mt-1">
                {methods.map((method) => (
                  <AuthMethodRow identityId={identity.id} key={method.id} method={method} />
                ))}
              </div>
            )}
          </div>

          <AddAuthMethodForm identityId={identity.id} />
          <ProjectGrants identityId={identity.id} />
        </div>
      ) : null}
    </div>
  )
}

export function OrganizationMachineIdentities() {
  const { toast } = useToast()
  const { data, isPending, isError } = useMachineIdentities()
  const createIdentity = useCreateMachineIdentity()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  async function handleCreate(): Promise<void> {
    if (!name.trim()) {
      toast.error('Give the identity a name so you can tell workloads apart.')
      return
    }
    try {
      await createIdentity.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
      })
      setName('')
      setDescription('')
      toast.success('Machine identity created.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to create an identity right now.'))
    }
  }

  const identities = data?.identities ?? []

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          Machine identities
        </CardTitle>
        <CardDescription>
          Let a pipeline, pod or instance authenticate with the credential its own cloud already
          gives it, instead of a long-lived key someone has to paste into CI. A successful login
          returns a short-lived token scoped to the projects granted below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[180px] flex-1 space-y-1">
            <label
              className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor="machine-identity-name"
            >
              Name
            </label>
            <Input
              id="machine-identity-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="ci-deploy"
              value={name}
            />
          </div>
          <div className="min-w-[180px] flex-1 space-y-1">
            <label
              className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor="machine-identity-description"
            >
              Description
            </label>
            <Input
              id="machine-identity-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Production deploy pipeline"
              value={description}
            />
          </div>
          <Button
            disabled={createIdentity.isPending}
            onClick={() => void handleCreate()}
            size="sm"
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
            Create
          </Button>
        </div>

        {isPending ? (
          <p className="text-sm text-muted-foreground">Loading machine identities...</p>
        ) : null}
        {isError ? (
          <p className="text-sm text-danger">Unable to load machine identities right now.</p>
        ) : null}
        {!isPending && !isError && identities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No machine identities yet.</p>
        ) : null}

        {identities.map((identity) => (
          <IdentityRow identity={identity} key={identity.id} />
        ))}
      </CardContent>
    </Card>
  )
}
