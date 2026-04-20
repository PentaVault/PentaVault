import type { ReactNode } from 'react'

import { cn } from '@/lib/utils/cn'

type AuthPanelProps = {
  eyebrow: string
  title: string
  description: string
  footer?: ReactNode
  children: ReactNode
  className?: string
}

export function AuthPanel({
  eyebrow,
  title,
  description,
  footer,
  children,
  className,
}: AuthPanelProps) {
  return (
    <section
      className={cn(
        'w-full max-w-lg rounded-2xl border border-accent-border bg-card p-6 sm:p-7 animate-[fade-in_220ms_ease-out]',
        className
      )}
    >
      <div className="space-y-2.5">
        <p className="text-xs font-mono tracking-[0.12em] uppercase text-[#00c573]">{eyebrow}</p>
        <h1 className="text-3xl leading-[1.08] tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="text-sm leading-7 text-muted-foreground">{description}</p>
      </div>

      <div className="mt-6">{children}</div>

      {footer ? (
        <div className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </section>
  )
}
