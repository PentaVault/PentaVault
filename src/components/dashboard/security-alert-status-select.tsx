'use client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateSecurityAlert } from '@/lib/hooks/use-security'
import { useToast } from '@/lib/hooks/use-toast'
import type { SecurityAlertStatus } from '@/lib/types/models'
import { getApiFriendlyMessage } from '@/lib/utils/errors'

const ALERT_STATUS_OPTIONS: SecurityAlertStatus[] = [
  'open',
  'acknowledged',
  'investigating',
  'mitigated',
  'resolved',
  'closed_no_action',
]

type SecurityAlertStatusSelectProps = {
  projectId: string
  alertId: string
  value: SecurityAlertStatus
}

function formatLabel(value: SecurityAlertStatus): string {
  return value
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

export function SecurityAlertStatusSelect({
  projectId,
  alertId,
  value,
}: SecurityAlertStatusSelectProps) {
  const updateAlert = useUpdateSecurityAlert(projectId)
  const { toast } = useToast()

  async function handleChange(nextStatus: SecurityAlertStatus): Promise<void> {
    try {
      await updateAlert.mutateAsync({
        alertId,
        input: {
          status: nextStatus,
        },
      })
      toast.success('Alert status updated.')
    } catch (updateError) {
      toast.error(getApiFriendlyMessage(updateError, 'Unable to update alert status right now.'))
    }
  }

  return (
    <Select
      key={value}
      onValueChange={(nextStatus) => void handleChange(nextStatus as SecurityAlertStatus)}
      value={value}
    >
      <SelectTrigger aria-label="Alert status" className="w-full">
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {ALERT_STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {formatLabel(status)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
