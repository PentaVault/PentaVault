import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'

type ErrorStateProps = {
  title: string
  message: string
  onRetry?: () => void
  showSupport?: boolean
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-danger/10 p-3">
        <AlertTriangle className="h-6 w-6 text-danger" />
      </div>
      <h3 className="mb-1 text-sm font-medium">{title}</h3>
      <p className="mb-4 max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button onClick={onRetry} size="sm" variant="outline">
          Try again
        </Button>
      ) : null}
    </div>
  )
}
