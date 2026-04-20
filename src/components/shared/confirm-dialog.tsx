'use client'

import type { ReactNode } from 'react'

import * as AlertDialog from '@radix-ui/react-alert-dialog'

type ConfirmDialogProps = {
  trigger: ReactNode
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/40" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6">
          <AlertDialog.Title className="text-2xl tracking-[-0.16px]">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            {description}
          </AlertDialog.Description>
          <div className="mt-4 flex items-center justify-end gap-2">
            <AlertDialog.Cancel className="rounded-md border border-border bg-background-deep px-6 py-2 text-sm text-foreground/90">
              {cancelLabel}
            </AlertDialog.Cancel>
            <AlertDialog.Action
              className="rounded-md border border-foreground bg-background-deep px-6 py-2 text-sm text-foreground"
              onClick={() => onConfirm()}
            >
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
