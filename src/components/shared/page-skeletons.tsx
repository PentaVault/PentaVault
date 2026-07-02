import { PageWrapper } from '@/components/layout/page-wrapper'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'

/**
 * Shared route-level loading skeletons. Route `loading.tsx` files render these
 * so every segment shows a consistent content-shaped placeholder instead of an
 * ad-hoc spinner while the server component streams in.
 */

function PageHeaderSkeleton() {
  return (
    <div className="mb-8 space-y-3">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  )
}

export function ListPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <PageWrapper>
      <PageHeaderSkeleton />
      <div className="space-y-2.5">
        {Array.from({ length: rows }, (_, index) => `row-${index}`).map((key) => (
          <Skeleton className="h-14 w-full" key={key} />
        ))}
      </div>
    </PageWrapper>
  )
}

export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <PageWrapper>
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => `card-${index}`).map((key) => (
          <Skeleton className="h-40 w-full rounded-xl" key={key} />
        ))}
      </div>
    </PageWrapper>
  )
}

export function DetailPageSkeleton() {
  return (
    <PageWrapper>
      <PageHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-full min-h-64 w-full rounded-xl" />
      </div>
    </PageWrapper>
  )
}

export function SettingsPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-3xl px-4 py-8', className)}>
      <PageHeaderSkeleton />
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  )
}
