'use client'

import { CheckCircle2, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ErrorState } from '@/components/shared/error-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch, SwitchThumb } from '@/components/ui/switch'
import { useProjectEnvironments } from '@/lib/hooks/use-project-configuration'
import {
  useCreateSecretValidationRule,
  useDeleteSecretValidationRule,
  useProjectSecretValidationRules,
  useUpdateSecretValidationRule,
} from '@/lib/hooks/use-secret-validation-rules'
import { useToast } from '@/lib/hooks/use-toast'
import type {
  CreateSecretValidationRuleInput,
  UpdateSecretValidationRuleInput,
} from '@/lib/types/api'
import type {
  SecretValidationRule,
  SecretValueConstraint,
  SecretValueConstraintType,
} from '@/lib/types/models'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

const CONSTRAINT_TYPES: Array<{
  value: SecretValueConstraintType
  label: string
  description: string
}> = [
  { value: 'min_length', label: 'Minimum length', description: 'Reject values shorter than N.' },
  { value: 'max_length', label: 'Maximum length', description: 'Reject values longer than N.' },
  {
    value: 'disallow_whitespace',
    label: 'No whitespace',
    description: 'Reject values containing spaces, tabs, or newlines.',
  },
  {
    value: 'regex',
    label: 'Pattern (regex)',
    description: 'Value must match the supplied expression.',
  },
  {
    value: 'allowed_values',
    label: 'Allowed values',
    description: 'Value must be one of a fixed set.',
  },
  {
    value: 'prevent_value_reuse',
    label: 'Prevent reuse',
    description: 'Reject values used in the last N versions.',
  },
]

type RuleForm = {
  name: string
  environmentId: string
  folderPath: string
  namePattern: string
  enabled: boolean
  constraints: SecretValueConstraint[]
}

const EMPTY_FORM: RuleForm = {
  name: '',
  environmentId: 'all',
  folderPath: '/',
  namePattern: '',
  enabled: true,
  constraints: [{ type: 'min_length', value: 8 }],
}

function defaultConstraintFor(type: SecretValueConstraintType): SecretValueConstraint {
  switch (type) {
    case 'regex':
      return { type: 'regex', pattern: '' }
    case 'min_length':
      return { type: 'min_length', value: 8 }
    case 'max_length':
      return { type: 'max_length', value: 128 }
    case 'disallow_whitespace':
      return { type: 'disallow_whitespace' }
    case 'allowed_values':
      return { type: 'allowed_values', values: [] }
    case 'prevent_value_reuse':
      return { type: 'prevent_value_reuse', versions: 3 }
    default:
      return { type: 'min_length', value: 8 }
  }
}

function describeConstraint(constraint: SecretValueConstraint): string {
  switch (constraint.type) {
    case 'regex':
      return constraint.description ?? `matches /${constraint.pattern}/`
    case 'min_length':
      return `min ${constraint.value} chars`
    case 'max_length':
      return `max ${constraint.value} chars`
    case 'disallow_whitespace':
      return 'no whitespace'
    case 'allowed_values':
      return `${constraint.values.length} allowed value${constraint.values.length === 1 ? '' : 's'}`
    case 'prevent_value_reuse':
      return `no reuse (last ${constraint.versions})`
    default:
      return ''
  }
}

function ruleToForm(rule: SecretValidationRule): RuleForm {
  return {
    name: rule.name,
    environmentId: rule.environmentId ?? 'all',
    folderPath: rule.folderPath,
    namePattern: rule.namePattern ?? '',
    enabled: rule.enabled,
    constraints: rule.constraints.length ? rule.constraints : [{ type: 'min_length', value: 8 }],
  }
}

export function ProjectSecretValidationRules({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const rulesQuery = useProjectSecretValidationRules(projectId)
  const environmentsQuery = useProjectEnvironments(projectId)
  const createRule = useCreateSecretValidationRule(projectId)
  const updateRule = useUpdateSecretValidationRule(projectId)
  const deleteRule = useDeleteSecretValidationRule(projectId)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<SecretValidationRule | null>(null)
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<SecretValidationRule | null>(null)

  const environments = environmentsQuery.data?.environments ?? []
  const rules = useMemo(() => rulesQuery.data?.rules ?? [], [rulesQuery.data])
  const isSaving = createRule.isPending || updateRule.isPending

  function openCreate() {
    setEditingRule(null)
    setForm(EMPTY_FORM)
    setIsDialogOpen(true)
  }

  function openEdit(rule: SecretValidationRule) {
    setEditingRule(rule)
    setForm(ruleToForm(rule))
    setIsDialogOpen(true)
  }

  function updateConstraint(index: number, next: SecretValueConstraint) {
    setForm((current) => ({
      ...current,
      constraints: current.constraints.map((constraint, position) =>
        position === index ? next : constraint
      ),
    }))
  }

  function removeConstraint(index: number) {
    setForm((current) => ({
      ...current,
      constraints: current.constraints.filter((_, position) => position !== index),
    }))
  }

  function addConstraint() {
    setForm((current) => ({
      ...current,
      constraints: [...current.constraints, defaultConstraintFor('regex')],
    }))
  }

  function buildPayload(): CreateSecretValidationRuleInput {
    return {
      name: form.name.trim(),
      environmentId: form.environmentId === 'all' ? null : form.environmentId,
      folderPath: form.folderPath.trim() || '/',
      namePattern: form.namePattern.trim() ? form.namePattern.trim() : null,
      enabled: form.enabled,
      constraints: form.constraints,
    }
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error('A rule name is required.')
      return
    }
    if (form.constraints.length === 0) {
      toast.error('Add at least one constraint.')
      return
    }
    try {
      if (editingRule) {
        await updateRule.mutateAsync({
          ruleId: editingRule.id,
          input: buildPayload() as UpdateSecretValidationRuleInput,
        })
        toast.success('Validation rule updated.')
      } else {
        await createRule.mutateAsync(buildPayload())
        toast.success('Validation rule created.')
      }
      setIsDialogOpen(false)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to save this validation rule right now.'))
    }
  }

  async function handleToggle(rule: SecretValidationRule) {
    try {
      await updateRule.mutateAsync({ ruleId: rule.id, input: { enabled: !rule.enabled } })
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to update this rule right now.'))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteRule.mutateAsync(deleteTarget.id)
      toast.success('Validation rule deleted.')
      setDeleteTarget(null)
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to delete this rule right now.'))
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-border">
      <div className="flex flex-col justify-between gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-accent" aria-hidden />
          <div>
            <p className="text-sm font-medium">Secret validation rules</p>
            <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
              Enforce value constraints when project secrets are created or updated. Rules scope by
              environment, folder, and name pattern.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} size="sm" type="button">
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          New rule
        </Button>
      </div>

      {rulesQuery.isError ? (
        <div className="px-4 py-4">
          <ErrorState
            title="Rules unavailable"
            message={getApiFriendlyMessage(rulesQuery.error, 'Unable to load validation rules.')}
            onRetry={() => void rulesQuery.refetch()}
          />
        </div>
      ) : rules.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          No validation rules yet. Add one to enforce formatting or reuse policies on secrets.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rules.map((rule) => {
            const environmentName =
              rule.environmentId === null
                ? 'All environments'
                : (environments.find((environment) => environment.id === rule.environmentId)
                    ?.name ?? 'Unknown environment')
            return (
              <li
                key={rule.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{rule.name}</span>
                    <StatusBadge tone={rule.enabled ? 'success' : 'neutral'}>
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {environmentName} · {rule.folderPath}
                    {rule.namePattern ? ` · /${rule.namePattern}/` : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {rule.constraints.map((constraint) => (
                      <Badge key={`${rule.id}-${describeConstraint(constraint)}`}>
                        {describeConstraint(constraint)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    aria-label={`Toggle ${rule.name}`}
                    checked={rule.enabled}
                    className="relative h-5 w-9 rounded-full border border-border bg-background-elevated transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent/35"
                    disabled={updateRule.isPending}
                    onCheckedChange={() => void handleToggle(rule)}
                  >
                    <SwitchThumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-foreground transition-transform data-[state=checked]:translate-x-4" />
                  </Switch>
                  <Button
                    aria-label={`Edit ${rule.name}`}
                    onClick={() => openEdit(rule)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    aria-label={`Delete ${rule.name}`}
                    onClick={() => setDeleteTarget(rule)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-danger" aria-hidden />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/45" />
          <DialogContent className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl">
            <DialogTitle className="text-lg">
              {editingRule ? 'Edit validation rule' : 'New validation rule'}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Applied to matching project secrets on create and update.
            </DialogDescription>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="svr-name">
                  Rule name
                </label>
                <Input
                  id="svr-name"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="prod-api-keys"
                  value={form.name}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium" htmlFor="svr-env">
                    Environment
                  </label>
                  <Select
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, environmentId: value }))
                    }
                    value={form.environmentId}
                  >
                    <SelectTrigger id="svr-env">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All environments</SelectItem>
                      {environments.map((environment) => (
                        <SelectItem key={environment.id} value={environment.id}>
                          {environment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" htmlFor="svr-folder">
                    Folder path
                  </label>
                  <Input
                    id="svr-folder"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, folderPath: event.target.value }))
                    }
                    placeholder="/"
                    value={form.folderPath}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium" htmlFor="svr-pattern">
                  Secret name pattern (optional regex)
                </label>
                <Input
                  id="svr-pattern"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, namePattern: event.target.value }))
                  }
                  placeholder="^API_"
                  value={form.namePattern}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium">Constraints</span>
                  <Button onClick={addConstraint} size="sm" type="button" variant="outline">
                    <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.constraints.map((constraint, index) => (
                    <ConstraintEditor
                      // biome-ignore lint/suspicious/noArrayIndexKey: constraints are edited in place by position; a content-derived key would remount the inputs and drop focus mid-edit.
                      key={`constraint-${index}`}
                      constraint={constraint}
                      onChange={(next) => updateConstraint(index, next)}
                      onRemove={() => removeConstraint(index)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Enabled</span>
                <Switch
                  aria-label="Enable rule"
                  checked={form.enabled}
                  className="relative h-5 w-9 rounded-full border border-border bg-background-elevated transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent/35"
                  onCheckedChange={(value) =>
                    setForm((current) => ({ ...current, enabled: value }))
                  }
                >
                  <SwitchThumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-foreground transition-transform data-[state=checked]:translate-x-4" />
                </Switch>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button onClick={() => setIsDialogOpen(false)} type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={isSaving} onClick={() => void handleSubmit()} type="button">
                <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
                {editingRule ? 'Save changes' : 'Create rule'}
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete validation rule</AlertDialogTitle>
          <AlertDialogDescription>
            Secrets will no longer be checked against &quot;{deleteTarget?.name}&quot;. This cannot
            be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleteRule.isPending} onClick={() => void handleDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ConstraintEditor({
  constraint,
  onChange,
  onRemove,
}: {
  constraint: SecretValueConstraint
  onChange: (next: SecretValueConstraint) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-md border border-border bg-background-elevated p-3">
      <div className="flex items-center gap-2">
        <Select
          onValueChange={(value) =>
            onChange(defaultConstraintFor(value as SecretValueConstraintType))
          }
          value={constraint.type}
        >
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONSTRAINT_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          aria-label="Remove constraint"
          onClick={onRemove}
          size="sm"
          type="button"
          variant="ghost"
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {(constraint.type === 'min_length' || constraint.type === 'max_length') && (
        <Input
          className="mt-2"
          min={1}
          onChange={(event) => onChange({ ...constraint, value: Number(event.target.value) })}
          placeholder="Length"
          type="number"
          value={constraint.value}
        />
      )}

      {constraint.type === 'prevent_value_reuse' && (
        <Input
          className="mt-2"
          min={1}
          onChange={(event) =>
            onChange({ type: 'prevent_value_reuse', versions: Number(event.target.value) })
          }
          placeholder="Versions"
          type="number"
          value={constraint.versions}
        />
      )}

      {constraint.type === 'regex' && (
        <div className="mt-2 space-y-2">
          <Input
            onChange={(event) => onChange({ ...constraint, pattern: event.target.value })}
            placeholder="^sk-[a-zA-Z0-9]+$"
            value={constraint.pattern}
          />
          <Input
            onChange={(event) => {
              const description = event.target.value.trim()
              onChange(
                description
                  ? { type: 'regex', pattern: constraint.pattern, description }
                  : { type: 'regex', pattern: constraint.pattern }
              )
            }}
            placeholder="Description (optional)"
            value={constraint.description ?? ''}
          />
        </div>
      )}

      {constraint.type === 'allowed_values' && (
        <Input
          className="mt-2"
          onChange={(event) =>
            onChange({
              type: 'allowed_values',
              values: event.target.value
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
            })
          }
          placeholder="Comma-separated values"
          value={constraint.values.join(', ')}
        />
      )}
    </div>
  )
}
