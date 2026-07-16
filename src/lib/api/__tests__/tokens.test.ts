import { issueTokenInputSchema, parseApiInput } from '@/lib/api/schemas'

describe('token issuance API schema', () => {
  it('accepts bounded runtime policy controls', () => {
    const parsed = parseApiInput(issueTokenInputSchema, {
      secretId: 'secret_1',
      mode: 'gateway',
      allowedIps: ['203.0.113.10', '2001:db8::10'],
      deviceFingerprint: 'device:production-runner',
      maxRequestsPerSecond: 5,
      maxRequestsTotal: 500,
      ttlSeconds: 3600,
    })

    expect(parsed.allowedIps).toHaveLength(2)
    expect(parsed.ttlSeconds).toBe(3600)
  })

  it('rejects unbounded policy inputs', () => {
    expect(() =>
      parseApiInput(issueTokenInputSchema, {
        secretId: 'secret_1',
        mode: 'gateway',
        maxRequestsPerSecond: 0,
        ttlSeconds: 10,
      })
    ).toThrow()
  })
})
