'use client'

import { Clock3, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useCreateProjectEnvironment,
  useProjectEnvironments,
} from '@/lib/hooks/use-project-configuration'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'
import { formatDateTime } from '@/lib/utils/format'

type ExpiryPreset = 'permanent' | '1h' | '1d' | '7d' | '30d'

const EXPIRY_MILLISECONDS: Record<Exclude<ExpiryPreset, 'permanent'>, number> = {
  '1h': 60 * 60 * 1_000,
  '1d': 24 * 60 * 60 * 1_000,
  '7d': 7 * 24 * 60 * 60 * 1_000,
  '30d': 30 * 24 * 60 * 60 * 1_000,
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function ProjectEnvironments({ projectId }: { projectId: string }) {
  const environmentsQuery = useProjectEnvironments(projectId)
  const createEnvironment = useCreateProjectEnvironment(projectId)
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [expiry, setExpiry] = useState<ExpiryPreset>('permanent')

  async function handleCreate(): Promise<void> {
    const normalizedName = name.trim()
    const normalizedSlug = slugify(slug || name)
    if (!normalizedName || !normalizedSlug) {
      toast.error('Enter an environment name and valid slug.')
      return
    }

    try {
      await createEnvironment.mutateAsync({
        name: normalizedName,
        slug: normalizedSlug,
        color: '#6366f1',
        expiresAt:
          expiry === 'permanent'
            ? null
            : new Date(Date.now() + EXPIRY_MILLISECONDS[expiry]).toISOString(),
      })
      setName('')
      setSlug('')
      setSlugEdited(false)
      setExpiry('permanent')
      toast.success('Environment created.')
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to create this environment right now.'))
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-border">
      <div className="border-b border-border px-4 py-4">
        <p className="text-sm font-medium">Environments</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Create permanent workspaces or temporary preview environments that clean themselves up.
        </p>
      </div>

      <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[1fr_1fr_180px_auto]">
        <Input
          aria-label="Environment name"
          onChange={(event) => {
            const nextName = event.target.value
            setName(nextName)
            if (!slugEdited) setSlug(slugify(nextName))
          }}
          placeholder="Preview 42"
          value={name}
        />
        <Input
          aria-label="Environment slug"
          onChange={(event) => {
            setSlugEdited(true)
            setSlug(slugify(event.target.value))
          }}
          placeholder="preview-42"
          value={slug}
        />
        <select
          aria-label="Environment lifetime"
          className="h-9 rounded-md border border-border bg-background-elevated px-3 text-sm"
          onChange={(event) => setExpiry(event.target.value as ExpiryPreset)}
          value={expiry}
        >
          <option value="permanent">Permanent</option>
          <option value="1h">Expires in 1 hour</option>
          <option value="1d">Expires in 1 day</option>
          <option value="7d">Expires in 7 days</option>
          <option value="30d">Expires in 30 days</option>
        </select>
        <Button
          disabled={createEnvironment.isPending}
          onClick={() => void handleCreate()}
          type="button"
        >
          <Plus className="mr-2 size-4" />
          {createEnvironment.isPending ? 'Creating...' : 'Create'}
        </Button>
      </div>

      <div className="divide-y divide-border">
        {environmentsQuery.isLoading ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">Loading environments...</p>
        ) : environmentsQuery.isError ? (
          <p className="px-4 py-4 text-sm text-danger">
            {getApiFriendlyMessage(environmentsQuery.error, 'Unable to load environments.')}
          </p>
        ) : (environmentsQuery.data?.environments.length ?? 0) === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No environments yet.</p>
        ) : (
          environmentsQuery.data?.environments.map((environment) => (
            <div
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              key={environment.id}
            >
              <div>
                <p className="text-sm font-medium">{environment.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{environment.slug}</p>
              </div>
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" />
                {environment.expiresAt
                  ? `Expires ${formatDateTime(environment.expiresAt)}`
                  : 'Permanent'}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
