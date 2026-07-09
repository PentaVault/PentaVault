'use client'

import { cn } from '@/lib/utils/cn'

export type SegmentedTabItem = {
  value: string
  label: string
}

type SegmentedTabsProps = {
  tabs: SegmentedTabItem[]
  value: string
  onValueChange: (value: string) => void
  className?: string
  'aria-label'?: string
}

/**
 * A minimal segmented control with a sliding active indicator. Purely
 * presentational + controlled: it drives `value` via `onValueChange`, so it can
 * back a controlled Radix `Tabs` (which then owns the `TabsContent` panels)
 * without duplicating any content logic. Equal-width segments let the indicator
 * translate by whole-segment percentages, so no DOM measurement is needed.
 */
export function SegmentedTabs({
  tabs,
  value,
  onValueChange,
  className,
  'aria-label': ariaLabel,
}: SegmentedTabsProps) {
  const count = tabs.length
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.value === value)
  )

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        'relative inline-grid w-full auto-cols-fr grid-flow-col rounded-lg border border-border bg-card-elevated p-1',
        className
      )}
      role="tablist"
    >
      {count > 0 ? (
        <span
          aria-hidden
          className="absolute inset-y-1 rounded-md border border-border bg-background-deep shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none"
          style={{
            left: '0.25rem',
            width: `calc((100% - 0.5rem) / ${count})`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
      ) : null}

      {tabs.map((tab) => {
        const isActive = tab.value === value
        return (
          <button
            aria-selected={isActive}
            className={cn(
              'relative z-10 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors duration-150 motion-reduce:transition-none',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
            key={tab.value}
            onClick={() => onValueChange(tab.value)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
