'use client'

import { ScanLine, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useScanContentForSecrets } from '@/lib/hooks/use-secret-scanning'
import { useToast } from '@/lib/hooks/use-toast'
import type { SecretScanFinding, SecretScanSeverity } from '@/lib/types/models'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

function severityTone(severity: SecretScanSeverity): 'success' | 'warning' | 'danger' | 'neutral' {
  if (severity === 'critical' || severity === 'high') return 'danger'
  if (severity === 'medium') return 'warning'
  return 'neutral'
}

export function ProjectSecretScanner({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const scan = useScanContentForSecrets(projectId)
  const [content, setContent] = useState('')
  const [findings, setFindings] = useState<SecretScanFinding[] | null>(null)

  async function handleScan() {
    if (!content.trim()) {
      toast.error('Paste some content to scan.')
      return
    }
    try {
      const result = await scan.mutateAsync({ content })
      setFindings(result.findings)
      if (result.findings.length === 0) {
        toast.success('No secrets detected.')
      }
    } catch (error) {
      toast.error(getApiFriendlyMessage(error, 'Unable to scan this content right now.'))
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-start gap-3">
          <ScanLine className="mt-0.5 h-5 w-5 text-accent" aria-hidden />
          <div>
            <CardTitle>Secret scanner</CardTitle>
            <CardDescription>
              Paste a config file, log, or diff to check for embedded provider credentials before
              committing it. Content is scanned in-memory and never stored; matches are redacted.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <textarea
          className="h-40 w-full resize-y rounded-md border border-border bg-background-elevated px-3 py-2 font-mono text-xs outline-none focus:border-accent"
          onChange={(event) => setContent(event.target.value)}
          placeholder="Paste content to scan for leaked secrets…"
          value={content}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {content.length.toLocaleString()} characters
          </p>
          <Button
            disabled={scan.isPending || !content.trim()}
            onClick={() => void handleScan()}
            size="sm"
            type="button"
          >
            <ScanLine className="mr-1.5 h-4 w-4" aria-hidden />
            {scan.isPending ? 'Scanning…' : 'Scan'}
          </Button>
        </div>

        {findings !== null ? (
          findings.length === 0 ? (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-background-elevated px-3 py-3 text-sm">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
              No secrets detected in the scanned content.
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-border">
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <ShieldAlert className="h-4 w-4 text-danger" aria-hidden />
                <span className="text-sm font-medium">
                  {findings.length} potential secret{findings.length === 1 ? '' : 's'} found
                </span>
              </div>
              <ul className="divide-y divide-border">
                {findings.map((finding) => (
                  <li
                    key={`${finding.ruleId}-${finding.line}-${finding.column}`}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={severityTone(finding.severity)}>
                          {finding.severity}
                        </StatusBadge>
                        <span className="truncate text-sm">{finding.description}</span>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        line {finding.line}:{finding.column} · {finding.redactedMatch}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  )
}
