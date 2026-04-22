'use client'

import { useMemo, useState } from 'react'

import { Code2, Eye, EyeOff, MoreHorizontal, Shield } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown'
import { useDeleteSecret, useProjectSecrets } from '@/lib/hooks/use-secrets'
import { useToast } from '@/lib/hooks/use-toast'
import type { Secret } from '@/lib/types/models'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'
import { formatRelativeDate } from '@/lib/utils/format'

export function SecretsList({ projectId, search }: { projectId: string; search: string }) {
  const secretsQuery = useProjectSecrets(projectId)

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return secretsQuery.data ?? []
    }

    const query = search.toLowerCase()
    return (secretsQuery.data ?? []).filter((secret) => secret.name.toLowerCase().includes(query))
  }, [secretsQuery.data, search])

  if (secretsQuery.isLoading) {
    return <SecretsListSkeleton />
  }

  if (filtered.length === 0 && !search.trim()) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <Shield className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">No secrets yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add your first environment variable to get started.
        </p>
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
        No matching variables.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {filtered.map((secret, index) => (
        <SecretRow
          isLast={index === filtered.length - 1}
          key={secret.id}
          projectId={projectId}
          secret={secret}
        />
      ))}
    </div>
  )
}

function SecretRow({
  secret,
  isLast,
  projectId,
}: {
  secret: Secret
  isLast: boolean
  projectId: string
}) {
  const [showValue, setShowValue] = useState(false)
  const deleteSecret = useDeleteSecret()
  const { toast } = useToast()

  async function handleDelete(): Promise<void> {
    try {
      await deleteSecret.mutateAsync({ projectId, secretId: secret.id })
      toast.success('Variable deleted.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to delete this variable right now.'))
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3 transition-colors hover:bg-card-elevated',
        !isLast && 'border-b border-border'
      )}
    >
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border border-border">
        <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <span className="min-w-0 flex-1 truncate font-mono text-sm">{secret.name}</span>

      <div className="flex items-center gap-2">
        <button
          className="text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setShowValue((current) => !current)}
          type="button"
        >
          {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <span className="font-mono text-sm text-muted-foreground">
          {showValue ? '(value hidden - edit to update)' : '*************'}
        </span>
      </div>

      <span className="w-28 text-right text-xs text-muted-foreground">
        {formatRelativeDate(secret.updatedAt)}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="h-6 w-6 p-0" size="sm" type="button" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              toast.info('Delete and add the variable again to replace its value.')
            }}
          >
            Edit value
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger"
            disabled={deleteSecret.isPending}
            onSelect={(event) => {
              event.preventDefault()
              void handleDelete()
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function SecretsListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="h-12 animate-pulse bg-card" />
      <div className="h-12 animate-pulse border-t border-border bg-card" />
      <div className="h-12 animate-pulse border-t border-border bg-card" />
    </div>
  )
}
