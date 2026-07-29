'use client'

import { GitCommitHorizontal, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useFolderCommits, useFolderDiff } from '@/lib/hooks/use-folder-commits'
import type { FolderCommit, FolderCommitOperation } from '@/lib/types/api'
import { cn } from '@/lib/utils/cn'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

const OPERATION_STYLES: Record<FolderCommitOperation, string> = {
  create: 'border-accent/40 bg-accent-muted text-accent-strong',
  update: 'border-sapphire/40 bg-sapphire-muted text-sapphire',
  delete: 'border-danger/40 bg-danger-muted text-danger',
}

function summarize(commit: FolderCommit): string {
  const counts = commit.changes.reduce<Record<string, number>>((totals, change) => {
    totals[change.operation] = (totals[change.operation] ?? 0) + 1
    return totals
  }, {})

  const parts = (['create', 'update', 'delete'] as const)
    .filter((operation) => counts[operation])
    .map((operation) => `${counts[operation]} ${operation}${counts[operation] > 1 ? 's' : ''}`)

  return parts.length > 0 ? parts.join(', ') : 'no changes'
}

function CommitRow({
  commit,
  isFrom,
  isTo,
  onSelect,
}: {
  commit: FolderCommit
  isFrom: boolean
  isTo: boolean
  onSelect: (endpoint: 'from' | 'to') => void
}) {
  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">#{commit.sequence}</span>
            <span className="text-sm font-medium">{commit.message ?? summarize(commit)}</span>
            {isFrom ? (
              <Badge className="border border-border text-muted-foreground">From</Badge>
            ) : null}
            {isTo ? <Badge className="border border-border text-muted-foreground">To</Badge> : null}
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(commit.createdAt).toLocaleString()} · {summarize(commit)}
          </p>

          <div className="mt-2 flex flex-wrap gap-1">
            {commit.changes.map((change) => (
              <Badge
                className={cn('border font-mono text-[11px]', OPERATION_STYLES[change.operation])}
                key={`${commit.id}-${change.secretId}`}
              >
                {change.operation} {change.secretName}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Button onClick={() => onSelect('from')} size="sm" type="button" variant="outline">
            Compare from
          </Button>
          <Button onClick={() => onSelect('to')} size="sm" type="button" variant="outline">
            Compare to
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ProjectFolderHistory({ projectId }: { projectId: string }) {
  const [folderPath, setFolderPath] = useState('/')
  const [from, setFrom] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)

  const commitsQuery = useFolderCommits(projectId, { folderPath })
  const diffQuery = useFolderDiff(projectId, from, to)

  const commits = useMemo(() => commitsQuery.data?.commits ?? [], [commitsQuery.data])

  function selectEndpoint(commitId: string, endpoint: 'from' | 'to'): void {
    if (endpoint === 'from') {
      setFrom((current) => (current === commitId ? null : commitId))
      return
    }
    setTo((current) => (current === commitId ? null : commitId))
  }

  const diff = diffQuery.data?.diff

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCommitHorizontal className="h-4 w-4 text-muted-foreground" />
          Folder history
        </CardTitle>
        <CardDescription>
          Every secret change in a folder, newest first. The log records which secrets changed and
          how — never their values — so anyone with project access can read it.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap items-end gap-2 border-b border-border pb-4">
          <div className="min-w-[200px] flex-1 space-y-1">
            <label
              className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
              htmlFor="folder-history-path"
            >
              Folder
            </label>
            <Input
              id="folder-history-path"
              onChange={(event) => {
                setFolderPath(event.target.value || '/')
                // Commit ids belong to one folder, so a folder change invalidates
                // any comparison already in progress.
                setFrom(null)
                setTo(null)
              }}
              placeholder="/"
              value={folderPath}
            />
          </div>

          {from && to ? (
            <Button
              onClick={() => {
                setFrom(null)
                setTo(null)
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              Clear comparison
            </Button>
          ) : null}
        </div>

        {from && to ? (
          <div className="mt-4 rounded-md border border-border bg-surface-muted p-3">
            {diffQuery.isPending ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Comparing...
              </p>
            ) : diffQuery.isError ? (
              <p className="text-sm text-danger">
                {getApiFriendlyMessage(diffQuery.error, 'Unable to compare these commits.')}
              </p>
            ) : diff && diff.entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No net change between #{diff.fromSequence} and #{diff.toSequence} — the secrets
                ended up where they started.
              </p>
            ) : diff ? (
              <div>
                <p className="text-xs text-muted-foreground">
                  Net change between #{diff.fromSequence} and #{diff.toSequence}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {diff.entries.map((entry) => (
                    <Badge
                      className={cn(
                        'border font-mono text-[11px]',
                        OPERATION_STYLES[entry.operation]
                      )}
                      key={entry.secretId}
                    >
                      {entry.operation} {entry.secretName}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {commitsQuery.isPending ? (
          <p className="py-6 text-sm text-muted-foreground">Loading history...</p>
        ) : commitsQuery.isError ? (
          <p className="py-6 text-sm text-danger">Unable to load the folder history.</p>
        ) : commits.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No recorded changes in {folderPath}. Secret edits appear here as they happen.
          </p>
        ) : (
          <div className="mt-2">
            {commits.map((commit) => (
              <CommitRow
                commit={commit}
                isFrom={from === commit.id}
                isTo={to === commit.id}
                key={commit.id}
                onSelect={(endpoint) => selectEndpoint(commit.id, endpoint)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
