'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

import { AuthPanel } from '@/components/auth/auth-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/api/auth'
import { useToast } from '@/lib/hooks/use-toast'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

export default function DeviceApprovalPage() {
  const { toast } = useToast()
  const [userCode, setUserCode] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitApproval(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    const normalizedCode = userCode.trim()
    if (!normalizedCode) {
      setError('Device user code is required.')
      return
    }

    try {
      setIsPending(true)
      await authApi.approveDevice(normalizedCode)
      toast.success('Device approved successfully.')
      setUserCode('')
    } catch (submitError) {
      const message = getApiFriendlyMessage(submitError, 'Unable to approve device right now.')
      setError(message)
      toast.error(message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AuthPanel
      eyebrow="Device Approval"
      title="Approve CLI sign in"
      description="Paste your device code from the CLI and approve this session-backed authorization request."
    >
      <form className="space-y-4" onSubmit={(event) => void submitApproval(event)}>
        <div className="space-y-1">
          <label
            className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground"
            htmlFor="device-code"
          >
            User code
          </label>
          <Input
            id="device-code"
            onChange={(event) => setUserCode(event.target.value)}
            placeholder="ABCD-EFGH"
            value={userCode}
          />
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <Button disabled={isPending} type="submit">
          {isPending ? 'Approving...' : 'Approve device'}
        </Button>
      </form>
    </AuthPanel>
  )
}
