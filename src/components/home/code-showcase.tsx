'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils/cn'

type Tone = 'comment' | 'accent' | 'muted'

type CodeLine = { id: string; text: string; tone?: Tone }

type Sample = {
  id: string
  label: string
  filename: string
  caption: string
  lines: CodeLine[]
}

/**
 * Assigns each line a stable id at definition time. Blank lines repeat, so the
 * text alone is not unique and the position has to be baked into the data
 * rather than reached for during render.
 */
function withLineIds(sampleId: string, lines: Array<{ text: string; tone?: Tone }>): CodeLine[] {
  return lines.map((line, index) => ({ ...line, id: `${sampleId}-line-${index}` }))
}

const SAMPLES: Sample[] = [
  {
    id: 'cli',
    label: 'CLI',
    filename: 'terminal',
    caption: 'Inject secrets into a child process. Nothing is written to disk or printed.',
    lines: withLineIds('cli', [
      { text: '$ pv init', tone: 'accent' },
      { text: '  ✓ linked to project checkout-api', tone: 'muted' },
      { text: '' },
      { text: '# run any command with secrets injected', tone: 'comment' },
      { text: '$ pv run -- npm start', tone: 'accent' },
      { text: '  ✓ 4 secrets injected from production', tone: 'muted' },
      { text: '  ✓ proxy token expires in 15m', tone: 'muted' },
      { text: '' },
      { text: '# no token ever touches your shell history', tone: 'comment' },
    ]),
  },
  {
    id: 'proxy',
    label: 'Proxy',
    filename: 'app.ts',
    caption: 'Point the SDK at the gateway. The real key is swapped in upstream.',
    lines: withLineIds('proxy', [
      { text: "import OpenAI from 'openai'", tone: 'muted' },
      { text: '' },
      { text: 'const client = new OpenAI({', tone: 'muted' },
      { text: '  // a scoped proxy token, not your real key', tone: 'comment' },
      { text: '  apiKey: process.env.PENTAVAULT_TOKEN,', tone: 'accent' },
      { text: "  baseURL: 'https://gateway.pentavault.dev/v1/openai',", tone: 'accent' },
      { text: '})', tone: 'muted' },
      { text: '' },
      { text: '// PentaVault authenticates upstream and logs the call', tone: 'comment' },
      { text: 'await client.responses.create({ model, input })', tone: 'muted' },
    ]),
  },
  {
    id: 'compat',
    label: 'Compatibility',
    filename: 'server.ts',
    caption: 'For clients that cannot be proxied, fetch the value directly — still audited.',
    lines: withLineIds('compat', [
      { text: "import { PentaVault } from '@pentavault/sdk'", tone: 'muted' },
      { text: '' },
      { text: 'const pv = new PentaVault({ token: process.env.PENTAVAULT_TOKEN })', tone: 'muted' },
      { text: '' },
      { text: '// resolved at runtime, never committed', tone: 'comment' },
      { text: "const url = await pv.get('DATABASE_URL')", tone: 'accent' },
      { text: '' },
      { text: '// every read appears in the audit log', tone: 'comment' },
      { text: 'const db = connect(url)', tone: 'muted' },
    ]),
  },
]

const TONE_CLASSES = {
  comment: 'text-muted-foreground/70',
  accent: 'text-accent-strong',
  muted: 'text-foreground-soft',
} as const

export function CodeShowcase() {
  const [activeId, setActiveId] = useState(SAMPLES[0].id)
  const active = SAMPLES.find((sample) => sample.id === activeId) ?? SAMPLES[0]

  return (
    <section className="border-t border-border bg-background py-20" id="developers">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Three lines, not a migration
          </h2>
          <p className="mt-4 text-muted-foreground">
            Use the CLI, the gateway, or direct reads. Whichever you pick, access is scoped and
            audited.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          <div
            aria-label="Integration examples"
            className="flex flex-wrap justify-center gap-2"
            role="tablist"
          >
            {SAMPLES.map((sample) => (
              <button
                aria-controls="code-sample-panel"
                aria-selected={sample.id === activeId}
                className={cn(
                  'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  sample.id === activeId
                    ? 'border-accent/50 bg-accent-muted text-accent-strong'
                    : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                )}
                key={sample.id}
                onClick={() => setActiveId(sample.id)}
                role="tab"
                type="button"
              >
                {sample.label}
              </button>
            ))}
          </div>

          <div
            className="mt-6 overflow-hidden rounded-xl border border-border bg-background-deep shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]"
            id="code-sample-panel"
            role="tabpanel"
          >
            <div className="flex items-center gap-2 border-b border-border bg-card-elevated/60 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 font-mono text-[11px] text-muted-foreground">
                {active.filename}
              </span>
            </div>

            <pre className="overflow-x-auto p-5 text-[13px] leading-6">
              <code className="font-mono">
                {active.lines.map((line) => (
                  <span
                    className={cn('block', line.tone ? TONE_CLASSES[line.tone] : 'text-foreground')}
                    key={line.id}
                  >
                    {line.text || ' '}
                  </span>
                ))}
              </code>
            </pre>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">{active.caption}</p>
        </div>
      </div>
    </section>
  )
}
