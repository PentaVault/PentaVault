export const SECRET_ACCESS_DURATIONS = [
  { value: '1h', label: '1 hour', milliseconds: 60 * 60 * 1_000 },
  { value: '8h', label: '8 hours', milliseconds: 8 * 60 * 60 * 1_000 },
  { value: '1d', label: '1 day', milliseconds: 24 * 60 * 60 * 1_000 },
  { value: '7d', label: '7 days', milliseconds: 7 * 24 * 60 * 60 * 1_000 },
  { value: '30d', label: '30 days', milliseconds: 30 * 24 * 60 * 60 * 1_000 },
  { value: '90d', label: '90 days', milliseconds: 90 * 24 * 60 * 60 * 1_000 },
  { value: 'never', label: 'No expiry', milliseconds: null },
] as const

export type SecretAccessDuration = (typeof SECRET_ACCESS_DURATIONS)[number]['value']

export function buildSecretAccessExpiry(
  duration: SecretAccessDuration,
  now = Date.now()
): string | null {
  const selected = SECRET_ACCESS_DURATIONS.find((option) => option.value === duration)
  if (!selected || selected.milliseconds === null) return null
  return new Date(now + selected.milliseconds).toISOString()
}
