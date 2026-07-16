import type { Secret } from '@/lib/types/models'

export type SecretRotationState = 'disabled' | 'scheduled' | 'due' | 'overdue'

export function getSecretRotationState(
  secret: Pick<Secret, 'nextRotationAt' | 'rotationIntervalDays' | 'rotationReminderDays'>,
  now = Date.now()
): SecretRotationState {
  if (!secret.rotationIntervalDays || !secret.nextRotationAt) return 'disabled'
  const dueAt = new Date(secret.nextRotationAt).getTime()
  if (!Number.isFinite(dueAt)) return 'disabled'
  if (dueAt <= now) return 'overdue'
  const reminderDays = secret.rotationReminderDays ?? 0
  return dueAt - reminderDays * 24 * 60 * 60 * 1_000 <= now ? 'due' : 'scheduled'
}
