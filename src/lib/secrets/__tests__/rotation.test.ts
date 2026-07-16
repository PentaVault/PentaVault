import { getSecretRotationState } from '@/lib/secrets/rotation'

const now = Date.parse('2026-07-16T00:00:00.000Z')

describe('secret rotation state', () => {
  it('distinguishes disabled, scheduled, due, and overdue policies', () => {
    expect(getSecretRotationState({}, now)).toBe('disabled')
    expect(
      getSecretRotationState(
        {
          rotationIntervalDays: 30,
          rotationReminderDays: 7,
          nextRotationAt: '2026-08-15T00:00:00.000Z',
        },
        now
      )
    ).toBe('scheduled')
    expect(
      getSecretRotationState(
        {
          rotationIntervalDays: 30,
          rotationReminderDays: 7,
          nextRotationAt: '2026-07-20T00:00:00.000Z',
        },
        now
      )
    ).toBe('due')
    expect(
      getSecretRotationState(
        {
          rotationIntervalDays: 30,
          rotationReminderDays: 7,
          nextRotationAt: '2026-07-15T00:00:00.000Z',
        },
        now
      )
    ).toBe('overdue')
  })
})
