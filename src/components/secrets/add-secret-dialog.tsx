'use client'

import { useState } from 'react'
import type { ChangeEvent, ClipboardEvent, FormEvent } from 'react'

import { Eye, EyeOff, Plus, Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCreateSecrets } from '@/lib/hooks/use-secrets'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

type SecretRowInput = {
  key: string
  value: string
  id: string
}

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
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [rows, setRows] = useState<SecretRowInput[]>([createEmptyRow()])
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})
  const createSecrets = useCreateSecrets()
  const { toast } = useToast()

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
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, [field]: field === 'key' ? value.toUpperCase() : value } : row
      )
    )
  }

  function resetRows() {
    setRows([createEmptyRow()])
    setShowValues({})
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const validRows = rows
      .map((row) => ({ ...row, key: row.key.trim(), value: row.value.trim() }))
      .filter((row) => row.key && row.value)

    if (validRows.length === 0) {
      return
    }

    try {
      await createSecrets.mutateAsync({ projectId, secrets: validRows })
      toast.success(`Saved ${validRows.length} variable${validRows.length === 1 ? '' : 's'}.`)
      onOpenChange(false)
      resetRows()
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to save these variables right now.'))
    }
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
        <DialogContent className="fixed top-1/2 left-1/2 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5">
          <DialogTitle className="text-lg font-medium">Add environment variable</DialogTitle>

          <form className="mt-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
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

            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Tip: Paste the contents of your <code>.env</code> file into the Key field above.
              Multiple variables will be detected automatically.
            </p>

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

              <div className="flex gap-2">
                <Button
                  onClick={() => onOpenChange(false)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={validCount === 0 || createSecrets.isPending}
                  size="sm"
                  type="submit"
                >
                  {createSecrets.isPending
                    ? 'Saving...'
                    : `Save ${validCount > 1 ? `${validCount} variables` : 'variable'}`}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
