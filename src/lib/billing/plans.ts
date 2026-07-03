/**
 * Billing plan definitions — the single source of truth for tier marketing and
 * (in a later phase) entitlement enforcement. Tiers are cloud-hosting focused;
 * limits are derived from a competitor comparison and the product's own free
 * allowance (3 members, unlimited projects).
 *
 * `null` limits mean "unlimited". Keep this shape stable: the backend billing
 * package mirrors these keys when it enforces quotas.
 */
export type PlanId = 'free' | 'pro' | 'team'

export type PlanLimits = {
  members: number | null
  projects: number | null
  environmentsPerProject: number | null
  auditRetentionDays: number
}

export type Plan = {
  id: PlanId
  name: string
  tagline: string
  /** Per-seat price in INR for this seat band; null => custom / contact. */
  priceMonthly: number | null
  /** ISO currency code for priceMonthly (INR). */
  currency: string
  priceUnit: string
  /** Seat band this tier is derived from (Polar graduated per-seat pricing). */
  seatBand: string
  highlighted: boolean
  limits: PlanLimits
  features: string[]
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'For personal projects and small teams getting started.',
    priceMonthly: 0,
    currency: 'INR',
    priceUnit: 'forever',
    seatBand: '1–3 seats',
    highlighted: false,
    limits: {
      members: 3,
      projects: null,
      environmentsPerProject: 2,
      auditRetentionDays: 7,
    },
    features: [
      'Up to 3 organisation members',
      'Unlimited projects',
      '2 environments per project',
      'Proxy tokens & compatibility mode',
      'MFA and passkeys',
      '7-day audit log retention',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For growing teams that need governance and approvals.',
    priceMonthly: 350,
    currency: 'INR',
    priceUnit: 'per member / month',
    seatBand: '4–15 seats',
    highlighted: true,
    limits: {
      members: 15,
      projects: null,
      environmentsPerProject: null,
      auditRetentionDays: 60,
    },
    features: [
      '4 to 15 organisation members',
      'Unlimited environments',
      'Role-based access & custom project roles',
      'Change requests & approvals',
      'Secret rotation reminders',
      '60-day audit log retention',
      'Priority email support',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'For organisations with compliance and scale needs.',
    priceMonthly: 600,
    currency: 'INR',
    priceUnit: 'per member / month',
    seatBand: '16+ seats',
    highlighted: false,
    limits: {
      members: null,
      projects: null,
      environmentsPerProject: null,
      auditRetentionDays: 180,
    },
    features: [
      '16+ organisation members',
      'SSO / SAML sign-in',
      'Advanced security analytics',
      'Change-request policies',
      'Trusted IPs & device binding',
      'Slack & webhook security alerts',
      '180-day audit log retention',
    ],
  },
]

export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((entry) => entry.id === id)
  if (!plan) {
    throw new Error(`Unknown plan: ${id}`)
  }
  return plan
}
