'use client'

import { AlertTriangle, Eye, EyeOff, Plus, Upload, X } from 'lucide-react'
import type { ChangeEvent, ClipboardEvent, FormEvent } from 'react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
import { useCreatePersonalSecret, useCreateSecrets } from '@/lib/hooks/use-secrets'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type SecretRowInput = {
  key: string
  value: string
  id: string
}

const SECRET_NAME_PATTERN = /^[A-Z0-9_]+$/
const MEMBER_DEVELOPMENT_ONLY_MESSAGE =
  'Members can create personal variables only in the development environment.'

function createEmptyRow(): SecretRowInput {
  return { key: '', value: '', id: crypto.randomUUID() }
}

function parseEnvText(text: string): SecretRowInput[] {
  return text
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const eqIndex = line.indexOf('=')
      const key = line.slice(0, eqIndex).trim()
      let value = line.slice(eqIndex + 1).trim()

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      if (!key || key.startsWith('#')) {
        return null
      }

      return { key: key.toUpperCase(), value, id: crypto.randomUUID() }
    })
    .filter((row): row is SecretRowInput => row !== null)
}

export function AddSecretDialog({
  allowProjectScope = false,
  environmentId,
  environmentSlug,
  projectId,
  open,
  onOpenChange,
}: {
  allowProjectScope?: boolean
  environmentId?: string | null
  environmentSlug?: string
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [rows, setRows] = useState<SecretRowInput[]>([createEmptyRow()])
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})
  const [encryptionMode, setEncryptionMode] = useState<'encrypted' | 'plaintext'>('encrypted')
  const [scope, setScope] = useState<'project' | 'personal'>(
    allowProjectScope ? 'project' : 'personal'
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingPlaintextRows, setPendingPlaintextRows] = useState<SecretRowInput[] | null>(null)
  const createSecrets = useCreateSecrets()
  const createPersonalSecret = useCreatePersonalSecret()
  const { toast } = useToast()
  const isSaving = createSecrets.isPending || createPersonalSecret.isPending

  function handleKeyPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData('text')
    const parsed = parseEnvText(text)

    if (parsed.length > 1) {
      event.preventDefault()
      setRows(parsed)
      toast.success(`Detected ${parsed.length} variables from paste. Review and save.`)
    }
  }

  function addRow() {
    setRows((current) => [...current, createEmptyRow()])
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id))
  }

  function updateRow(id: string, field: 'key' | 'value', value: string) {
    setFormError(null)
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, [field]: field === 'key' ? value.toUpperCase() : value } : row
      )
    )
  }

  function resetRows() {
    setRows([createEmptyRow()])
    setShowValues({})
    setEncryptionMode('encrypted')
    setScope(allowProjectScope ? 'project' : 'personal')
    setFormError(null)
    setPendingPlaintextRows(null)
  }

  async function saveRows(validRows: SecretRowInput[]): Promise<void> {
    if (validRows.length === 0) {
      return
    }

    try {
      const result =
        scope === 'personal'
          ? await Promise.all(
              validRows.map((row) =>
                createPersonalSecret.mutateAsync({
                  projectId,
                  environment: environmentSlug ?? 'development',
                  encryptionMode,
                  name: row.key,
                  plaintext: row.value,
                  mode: 'compatibility',
                  ...(environmentId ? { environmentId } : {}),
                })
              )
            ).then((responses) => ({
              imported: responses.map((response) => ({
                name: response.secret.name,
                secretId: response.secret.id,
                currentVersionId: response.currentVersionId,
                versionNumber: response.versionNumber,
              })),
              updated: [],
              failed: [],
            }))
          : await createSecrets.mutateAsync({
              projectId,
              environment: environmentSlug ?? 'development',
              encryptionMode,
              scope: 'project',
              secrets: validRows,
              ...(environmentId ? { environmentId } : {}),
            })
      const addedCount = result.imported.length
      const updatedCount = result.updated?.length ?? 0
      const failedCount = result.failed?.length ?? 0

      if (addedCount > 0 || updatedCount > 0) {
        const parts = [
          addedCount > 0 ? `${addedCount} added` : null,
          updatedCount > 0 ? `${updatedCount} updated` : null,
        ].filter(Boolean)
        toast.success(`Saved variables: ${parts.join(', ')}.`)
      }

      if (failedCount > 0) {
        const firstFailure = result.failed?.[0]
        toast.error(
          `${failedCount} variable${failedCount === 1 ? '' : 's'} could not be saved${
            firstFailure ? `: ${firstFailure.name} - ${firstFailure.reason}` : '.'
          }`
        )
      }

      onOpenChange(false)
      resetRows()
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to save these variables right now.'))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const validRows = rows
      .map((row) => ({ ...row, key: row.key.trim(), value: row.value.trim() }))
      .filter((row) => row.key && row.value)

    if (!allowProjectScope && (environmentSlug ?? 'development') !== 'development') {
      setFormError(MEMBER_DEVELOPMENT_ONLY_MESSAGE)
      return
    }

    if (validRows.length === 0) {
      setFormError('Add at least one KEY=VALUE pair before saving.')
      return
    }

    const invalidName = validRows.find((row) => !SECRET_NAME_PATTERN.test(row.key))
    if (invalidName) {
      setFormError(
        `${invalidName.key} is not a valid variable name. Use uppercase letters, numbers, and underscores only.`
      )
      return
    }

    const seen = new Set<string>()
    const duplicate = validRows.find((row) => {
      if (seen.has(row.key)) {
        return true
      }
      seen.add(row.key)
      return false
    })
    if (duplicate) {
      setFormError(`${duplicate.key} appears more than once. Remove duplicates before saving.`)
      return
    }

    if (validRows.length > 100) {
      setFormError('No more than 100 variables can be saved at once.')
      return
    }

    if (encryptionMode === 'plaintext') {
      setPendingPlaintextRows(validRows)
      return
    }

    await saveRows(validRows)
  }

  function handleFileImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const text = String(loadEvent.target?.result ?? '')
      const parsed = parseEnvText(text)

      if (parsed.length > 0) {
        setRows(parsed)
        toast.success(`Imported ${parsed.length} variables from ${file.name}.`)
      } else {
        toast.error('No valid KEY=VALUE pairs found in the file.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const validCount = rows.filter((row) => row.key.trim() && row.value.trim()).length

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          resetRows()
        }
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/45" />
        <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-lg border border-border bg-card p-6">
          <DialogTitle className="text-lg font-medium">
            Add {scope === 'personal' ? 'personal ' : ''}environment variable
          </DialogTitle>

          <form className="mt-3 pt-2" onSubmit={(event) => void handleSubmit(event)}>
            <div className="mb-4 grid gap-3">
              <div className="grid gap-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="scope-mode">
                  Save as
                </label>
                <Select
                  onValueChange={(value) => setScope(value === 'project' ? 'project' : 'personal')}
                  value={scope}
                >
                  <SelectTrigger id="scope-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowProjectScope ? <SelectItem value="project">Project</SelectItem> : null}
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
                {!allowProjectScope ? (
                  <p className="text-xs text-muted-foreground">
                    Members save personal development variables first, then request approval to
                    promote them to project development.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="max-h-[52vh] space-y-3 overflow-y-auto p-1">
              {rows.map((row, index) => (
                <div className="flex items-start gap-2" key={row.id}>
                  <div className="flex-1 space-y-2">
                    <Input
                      autoFocus={index === 0}
                      className="font-mono text-sm"
                      onChange={(event) => updateRow(row.id, 'key', event.target.value)}
                      onPaste={handleKeyPaste}
                      placeholder="KEY"
                      value={row.key}
                    />
                    <div className="relative">
                      <Input
                        className="pr-9 font-mono text-sm"
                        onChange={(event) => updateRow(row.id, 'value', event.target.value)}
                        placeholder="Value"
                        type={showValues[row.id] ? 'text' : 'password'}
                        value={row.value}
                      />
                      <button
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() =>
                          setShowValues((current) => ({
                            ...current,
                            [row.id]: !current[row.id],
                          }))
                        }
                        type="button"
                      >
                        {showValues[row.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {rows.length > 1 ? (
                    <button
                      className="mt-2 text-muted-foreground transition-colors hover:text-danger"
                      onClick={() => removeRow(row.id)}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <button
              className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={addRow}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Add another
            </button>

            {formError ? (
              <p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {formError}
              </p>
            ) : null}

            <div className="mt-4 flex items-start justify-between gap-4 border-t border-border pt-3">
              <p className="min-w-0 text-xs text-muted-foreground">
                Tip: Paste the contents of your <code>.env</code> file into the Key field above.
                Multiple variables will be detected automatically.
              </p>
              <div className="flex flex-shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <span>Encrypted</span>
                <Switch
                  aria-label="Toggle encrypted storage"
                  checked={encryptionMode === 'encrypted'}
                  className="relative h-5 w-9 rounded-full border border-border bg-background-elevated transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent/35"
                  onCheckedChange={(checked) =>
                    setEncryptionMode(checked ? 'encrypted' : 'plaintext')
                  }
                >
                  <SwitchThumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-foreground transition-transform data-[state=checked]:translate-x-4" />
                </Switch>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <label className="cursor-pointer">
                <input
                  accept=".env,.env.local,.env.development,.env.production,text/plain"
                  className="sr-only"
                  onChange={handleFileImport}
                  type="file"
                />
                <Button asChild size="sm" type="button" variant="outline">
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Import .env file
                  </span>
                </Button>
              </label>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => onOpenChange(false)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={validCount === 0 || isSaving} size="sm" type="submit">
                  {isSaving
                    ? 'Saving...'
                    : `Save ${validCount > 1 ? `${validCount} variables` : 'variable'}`}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
      <AlertDialog
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPendingPlaintextRows(null)
          }
        }}
        open={Boolean(pendingPlaintextRows)}
      >
        <AlertDialogContent>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Saving without encryption
          </AlertDialogTitle>
          <AlertDialogDescription>
            This secret will be stored in a recoverable format. You&apos;ll be able to view and edit
            the value later. This is not recommended for production API keys.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              onClick={() => {
                const pendingRows = pendingPlaintextRows ?? []
                setPendingPlaintextRows(null)
                void saveRows(pendingRows)
              }}
            >
              Save anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
