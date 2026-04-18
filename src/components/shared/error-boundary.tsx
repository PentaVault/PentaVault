'use client'

import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {}

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            A component error was caught by the shared boundary.
          </div>
        )
      )
    }

    return this.props.children
  }
}
