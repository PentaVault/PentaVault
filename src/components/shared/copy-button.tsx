'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { copyToClipboard } from '@/lib/utils/copy'
import { getApiErrorMessage } from '@/lib/utils/errors'

type CopyButtonProps = {
  value: string
  label?: string
  idleLabel?: string
  successLabel?: string
}

export function CopyButton({
  value,
  label,
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
    <Button
      aria-label={copied ? 'Copied!' : (label ?? idleLabel)}
      onClick={() => void handleCopy()}
      size="sm"
      type="button"
      variant="outline"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? successLabel : idleLabel}
    </Button>
  )
}
