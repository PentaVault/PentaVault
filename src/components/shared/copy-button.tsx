'use client'

import { useState } from 'react'

import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { copyToClipboard } from '@/lib/utils/copy'
import { getApiErrorMessage } from '@/lib/utils/errors'

type CopyButtonProps = {
  value: string
  idleLabel?: string
  successLabel?: string
}

export function CopyButton({
  value,
  idleLabel = 'Copy',
  successLabel = 'Copied',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(): Promise<void> {
    try {
      const didCopy = await copyToClipboard(value)

      if (!didCopy) {
        toast.error('Clipboard access is not available in this browser context.')
        return
      }

      setCopied(true)
      toast.success('Value copied to clipboard.')
      window.setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to copy the value.'))
    }
  }

  return (
    <Button onClick={() => void handleCopy()} size="sm" type="button" variant="outline">
      {copied ? successLabel : idleLabel}
    </Button>
  )
}
