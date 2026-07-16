import { buildSecretAccessExpiry, SECRET_ACCESS_DURATIONS } from '@/lib/utils/secret-access-expiry'

describe('secret access expiry', () => {
  it('builds deterministic bounded access windows', () => {
    const now = Date.parse('2026-07-16T00:00:00.000Z')

    expect(buildSecretAccessExpiry('1h', now)).toBe('2026-07-16T01:00:00.000Z')
    expect(buildSecretAccessExpiry('90d', now)).toBe('2026-10-14T00:00:00.000Z')
    expect(buildSecretAccessExpiry('never', now)).toBeNull()
  })

  it('keeps every finite UI option inside the backend 365-day ceiling', () => {
    const maximum = 365 * 24 * 60 * 60 * 1_000
    const finiteDurations = SECRET_ACCESS_DURATIONS.flatMap((option) =>
      option.milliseconds === null ? [] : [option.milliseconds]
    )

    expect(finiteDurations.every((duration) => duration > 0 && duration <= maximum)).toBe(true)
  })
})
