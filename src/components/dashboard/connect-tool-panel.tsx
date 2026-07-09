'use client'

import Link from 'next/link'
import { useState } from 'react'

import { CopyButton } from '@/components/shared/copy-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SegmentedTabs } from '@/components/ui/segmented-tabs'
import { GATEWAY_PROVIDERS, SETTINGS_ACCOUNT_TOKENS_PATH } from '@/lib/constants'

type StackId = 'node' | 'python' | 'custom'

const STACK_TABS: { id: StackId; label: string }[] = [
  { id: 'node', label: 'Node' },
  { id: 'python', label: 'Python' },
  { id: 'custom', label: 'Custom' },
]

const LAUNCH_COMMANDS: Record<StackId, string> = {
  node: 'pv run -- npm run dev',
  python: 'pv run -- python app.py',
  custom: 'pv run -- <your start command>',
}

const AUTH_COMMANDS = [
  'pv login',
  '',
  '# ...or paste an API key non-interactively (stored in the OS keyring):',
  'pv login --token-stdin',
].join('\n')

const DEFAULT_ENVIRONMENT = 'development'

const PROXIED_PROVIDERS = GATEWAY_PROVIDERS.filter((provider) => provider.available)
  .map((provider) => provider.label)
  .join(', ')

function selectCommands(projectId: string): string {
  return [`pv projects select ${projectId}`, `pv envs select ${DEFAULT_ENVIRONMENT}`].join('\n')
}

type CodeSnippetProps = {
  code: string
}

function CodeSnippet({ code }: CodeSnippetProps) {
  return (
    <div className="relative rounded-xl border border-border bg-background-elevated">
      <div className="absolute right-2 top-2">
        <CopyButton value={code} />
      </div>
      <pre className="overflow-x-auto p-4 pr-24 text-sm">
        <code className="font-mono whitespace-pre text-foreground">{code}</code>
      </pre>
    </div>
  )
}

type StepProps = {
  index: number
  title: string
  description: React.ReactNode
  children?: React.ReactNode
}

function Step({ index, title, description, children }: StepProps) {
  return (
    <div className="flex gap-4">
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card-elevated text-sm font-medium text-foreground"
      >
        {index}
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

type ConnectToolPanelProps = {
  projectId?: string
}

export function ConnectToolPanel({ projectId }: ConnectToolPanelProps = {}) {
  const [stack, setStack] = useState<StackId>('node')
  const projectRef = projectId ?? 'proj_abc'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connect your tool</CardTitle>
          <CardDescription>
            Authenticate this machine once, then launch your app through PentaVault. Your code reads
            normal env vars (like <code className="font-mono">OPENAI_API_KEY</code>) that{' '}
            <code className="font-mono">pv run</code> injects at launch — you never paste a token
            into your app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <Step
            description={
              <>
                Generate an API key for this machine on the{' '}
                <Link
                  className="text-foreground underline underline-offset-4 hover:text-accent"
                  href={SETTINGS_ACCOUNT_TOKENS_PATH}
                >
                  account tokens page
                </Link>
                . It identifies this device to PentaVault.
              </>
            }
            index={1}
            title="Create a machine API key"
          />

          <Step
            description="Approve this device once. Either opens a browser device-approval page, or reads the API key from stdin and stores it in the OS keyring."
            index={2}
            title="Authenticate this machine"
          >
            <CodeSnippet code={AUTH_COMMANDS} />
          </Step>

          <Step
            description="Tell the CLI which project and environment to pull secrets from."
            index={3}
            title="Point the CLI at this project"
          >
            <CodeSnippet code={selectCommands(projectRef)} />
          </Step>

          <Step
            description="PentaVault injects the project's secrets as environment variables into your app at launch."
            index={4}
            title="Launch your app through PentaVault"
          >
            <SegmentedTabs
              aria-label="Launch command by stack"
              onValueChange={(value) => setStack(value as StackId)}
              tabs={STACK_TABS.map((entry) => ({ value: entry.id, label: entry.label }))}
              value={stack}
            />
            <CodeSnippet code={LAUNCH_COMMANDS[stack]} />
          </Step>

          <p className="text-sm text-muted-foreground">
            If this machine isn&apos;t authenticated with PentaVault,{' '}
            <code className="font-mono">pv run</code> exits and your app never starts — no secrets
            ever touch disk.
          </p>
        </CardContent>
      </Card>

      {PROXIED_PROVIDERS ? (
        <p className="text-xs text-muted-foreground">
          Provider calls (e.g. {PROXIED_PROVIDERS}) can also be routed through the PentaVault
          gateway so upstream keys stay server-side.
        </p>
      ) : null}
    </div>
  )
}
