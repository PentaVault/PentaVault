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
  priceMonthly: number | null // null => custom / contact
  priceUnit: string
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
    priceUnit: 'forever',
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
    priceMonthly: 12,
    priceUnit: 'per member / month',
    highlighted: true,
    limits: {
      members: 10,
      projects: null,
      environmentsPerProject: null,
      auditRetentionDays: 30,
    },
    features: [
      'Up to 10 organisation members',
      'Unlimited environments',
      'Role-based access & custom project roles',
      'Change requests & approvals',
      'Secret rotation reminders',
      '30-day audit log retention',
      'Priority email support',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'For organisations with compliance and scale needs.',
    priceMonthly: 28,
    priceUnit: 'per member / month',
    highlighted: false,
    limits: {
      members: 50,
      projects: null,
      environmentsPerProject: null,
      auditRetentionDays: 90,
    },
    features: [
      'Up to 50 organisation members',
      'SSO / SAML sign-in',
      'Change-request policies',
      'Trusted IPs & device binding',
      'Slack & webhook security alerts',
      'Security analytics dashboard',
      '90-day audit log retention',
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
