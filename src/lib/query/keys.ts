export const queryKeys = {
  invitationAll: ['invitation'] as const,
  invitation: (token: string) => ['invitation', token] as const,
  notifications: {
    all: ['notifications'] as const,
  },
  organizationMembers: {
    all: ['organization-members'] as const,
    list: (organizationId: string | null) => ['organization-members', organizationId] as const,
  },
  organizationInvitations: {
    all: ['organization-invitations'] as const,
    list: (organizationId: string | null) => ['organization-invitations', organizationId] as const,
  },
  organizations: {
    all: ['organizations'] as const,
  },
  projects: {
    all: ['projects'] as const,
    detailAll: ['project'] as const,
    list: (organizationId: string | null) => ['projects', organizationId] as const,
    detail: (projectId: string | null) => ['project', projectId] as const,
  },
  projectAccessRequests: {
    all: ['project-access-requests'] as const,
    list: (projectId: string | null, status: string) =>
      ['project-access-requests', projectId, status] as const,
  },
  projectAudit: {
    all: ['project-audit'] as const,
    list: (projectId: string | null, query: unknown) =>
      ['project-audit', projectId, query] as const,
  },
  projectAnalytics: {
    all: ['project-analytics'] as const,
    project: (projectId: string | null, query: unknown) =>
      ['project-analytics', projectId, query] as const,
    secret: (projectId: string | null, secretId: string | null, query: unknown) =>
      ['project-analytics', projectId, 'secret', secretId, query] as const,
    user: (projectId: string | null, userId: string | null, query: unknown) =>
      ['project-analytics', projectId, 'user', userId, query] as const,
    token: (projectId: string | null, tokenId: string | null, query: unknown) =>
      ['project-analytics', projectId, 'token', tokenId, query] as const,
  },
  projectEnvironments: {
    all: ['project-environments'] as const,
    list: (projectId: string | null) => ['project-environments', projectId] as const,
  },
  projectSettings: {
    all: ['project-settings'] as const,
    detail: (projectId: string | null) => ['project-settings', projectId] as const,
  },
  projectMembers: {
    all: ['project-members'] as const,
    list: (projectId: string | null) => ['project-members', projectId] as const,
  },
  projectSecrets: {
    all: ['project-secrets'] as const,
    list: (projectId: string | null) => ['project-secrets', projectId] as const,
    personal: (projectId: string | null) => ['project-secrets', projectId, 'personal'] as const,
    access: (projectId: string | null) => ['project-secrets', projectId, 'access'] as const,
    secretAccess: (projectId: string | null, secretId: string | null) =>
      ['project-secrets', projectId, secretId, 'access'] as const,
    promotionRequests: (projectId: string | null) =>
      ['project-secrets', projectId, 'promotion-requests'] as const,
  },
  projectSecurityAlerts: {
    all: ['project-security-alerts'] as const,
    list: (projectId: string | null) => ['project-security-alerts', projectId] as const,
  },
  projectSecurityRecommendations: {
    all: ['project-security-recommendations'] as const,
    list: (projectId: string | null) => ['project-security-recommendations', projectId] as const,
  },
  projectTokens: {
    all: ['project-tokens'] as const,
    list: (projectId: string | null) => ['project-tokens', projectId] as const,
  },
  userSearchAll: ['user-search'] as const,
  userSearch: (organizationId: string | null, query: string) =>
    ['user-search', organizationId, query] as const,
} as const
