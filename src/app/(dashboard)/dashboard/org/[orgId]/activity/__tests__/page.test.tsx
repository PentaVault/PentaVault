import { render, screen, waitFor } from '@testing-library/react'
import type { AuditEvent } from '@/lib/types/models'

import OrganizationActivityPage from '../page'

function hasExactText(expectedText: string) {
  return (_content: string, element: Element | null) => element?.textContent === expectedText
}

const fetchNextPage = vi.fn(async () => undefined)
const refetch = vi.fn(async () => undefined)
type MockQueryResult = {
  data?: Array<{ id: string; name: string }>
}

type MockActivityResult = {
  data: {
    pages: Array<{
      events: AuditEvent[]
      nextCursor: string | null
    }>
  }
  isError: boolean
  isFetching: boolean
  isLoading: boolean
  error: Error | null
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: typeof fetchNextPage
  refetch: typeof refetch
}

const {
  listPersonalSecretsMock,
  listProjectSecretsMock,
  useInfiniteOrganizationActivityMock,
  useProjectsQueryMock,
  useQueriesMock,
} = vi.hoisted(() => ({
  listPersonalSecretsMock: vi.fn(),
  listProjectSecretsMock: vi.fn(),
  useQueriesMock: vi.fn<() => MockQueryResult[]>(() => []),
  useProjectsQueryMock: vi.fn(() => ({
    data: {
      projects: [
        {
          project: {
            id: 'project_123',
            name: 'Alpha',
          },
        },
      ],
    },
  })),
  useInfiniteOrganizationActivityMock: vi.fn<() => MockActivityResult>(() => ({
    data: {
      pages: [
        {
          events: [
            {
              id: 'audit_success_1',
              eventType: 'secrets.updated',
              outcome: 'success',
              actorUserId: 'user_123',
              actorSessionId: 'session_123',
              projectId: 'project_123',
              secretId: 'secret_123',
              tokenId: null,
              route: '/api/v1/projects/project_123/secrets/secret_123',
              sourceIp: null,
              failureReason: null,
              metadata: {
                projectName: 'Alpha',
                environment: 'development',
                secretName: 'DATABASE_URL',
              },
              occurredAt: '2026-05-11T10:00:00.000Z',
            },
            {
              id: 'audit_failure_1',
              eventType: 'projects.members.updated',
              outcome: 'failure',
              actorUserId: 'user_123',
              actorSessionId: 'session_123',
              projectId: 'project_123',
              secretId: null,
              tokenId: null,
              route: '/api/v1/projects/project_123/members/user_456',
              sourceIp: null,
              failureReason: 'Role change was rejected.',
              metadata: {
                projectName: 'Alpha',
                targetName: 'Sam Dev',
                previousRole: 'developer',
                role: 'admin',
                requestId: 'req_123',
              },
              occurredAt: '2026-05-11T11:00:00.000Z',
            },
            {
              id: 'audit_member_added_1',
              eventType: 'auth.organization.member.added',
              outcome: 'success',
              actorUserId: 'user_123',
              actorSessionId: 'session_123',
              projectId: null,
              secretId: null,
              tokenId: null,
              route: '/api/v1/invitations/invitation_123/accept',
              sourceIp: null,
              failureReason: null,
              metadata: {
                organizationId: 'org_123',
                targetUserId: 'user_123',
                role: 'owner',
              },
              occurredAt: '2026-05-11T12:00:00.000Z',
            },
          ],
          nextCursor: null,
        },
      ],
    },
    isError: false,
    isFetching: false,
    isLoading: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage,
    refetch,
  })),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_123' }),
  useSearchParams: () => new URLSearchParams('event=audit_failure_1'),
}))

vi.mock('@tanstack/react-query', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')

  return {
    ...actual,
    useQueries: useQueriesMock,
  }
})

vi.mock('@/lib/api/secrets', () => ({
  secretsApi: {
    listProjectSecrets: listProjectSecretsMock,
    listPersonalSecrets: listPersonalSecretsMock,
  },
}))

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    activeOrganization: {
      organization: {
        id: 'org_123',
      },
    },
  }),
}))

vi.mock('@/lib/hooks/use-projects', () => ({
  useProjectsQuery: useProjectsQueryMock,
}))

vi.mock('@/lib/hooks/use-team', () => ({
  useOrganizationMembers: () => ({
    data: {
      members: [
        {
          user: {
            id: 'user_123',
            name: 'Abhash Chakraborty',
            email: 'abhash@example.com',
          },
        },
      ],
    },
  }),
}))

vi.mock('@/lib/hooks/use-audit', () => ({
  useInfiniteOrganizationActivity: useInfiniteOrganizationActivityMock,
}))

describe('OrganizationActivityPage', () => {
  beforeEach(() => {
    fetchNextPage.mockClear()
    refetch.mockClear()
    useQueriesMock.mockReset()
    useQueriesMock.mockReturnValue([])
    useProjectsQueryMock.mockClear()
    useInfiniteOrganizationActivityMock.mockClear()
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('renders rich activity copy without showing success badges', async () => {
    render(<OrganizationActivityPage />)

    expect(
      screen.getByText(hasExactText('Updated DATABASE_URL in development of Alpha.'))
    ).toBeInTheDocument()
    expect(screen.getByText(hasExactText('Updated Sam Dev in Alpha.'))).toBeInTheDocument()
    expect(screen.queryByText('Success')).not.toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('audit_success_1')).toBeInTheDocument()
    expect(screen.getByText('audit_failure_1')).toBeInTheDocument()
    expect(screen.getByText('Joined the organisation.')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Copy URL').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    })
  })

  it('falls back to project and secret lookups when activity metadata is sparse', () => {
    useInfiniteOrganizationActivityMock.mockReturnValueOnce({
      data: {
        pages: [
          {
            events: [
              {
                id: 'audit_sparse_1',
                eventType: 'secrets.updated',
                outcome: 'success',
                actorUserId: 'user_123',
                actorSessionId: 'session_123',
                projectId: null,
                secretId: null,
                tokenId: null,
                route: '/api/v1/projects/project_123/secrets/secret_123',
                sourceIp: null,
                failureReason: null,
                metadata: {
                  environment: 'development',
                },
                occurredAt: '2026-05-11T10:00:00.000Z',
              },
            ],
            nextCursor: null,
          },
        ],
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage,
      refetch,
    })
    useQueriesMock.mockReturnValueOnce([
      {
        data: [
          {
            id: 'secret_123',
            name: 'DATABASE_URL',
          },
        ],
      },
    ])

    render(<OrganizationActivityPage />)

    expect(
      screen.getByText(hasExactText('Updated DATABASE_URL in development of Alpha.'))
    ).toBeInTheDocument()
    expect(screen.getAllByText('DATABASE_URL').length).toBeGreaterThan(0)
  })

  it('renders project archive and restore transitions with distinct status chips', () => {
    useInfiniteOrganizationActivityMock.mockReturnValueOnce({
      data: {
        pages: [
          {
            events: [
              {
                id: 'audit_archive_1',
                eventType: 'projects.updated',
                outcome: 'success',
                actorUserId: 'user_123',
                actorSessionId: 'session_123',
                projectId: 'project_123',
                secretId: null,
                tokenId: null,
                route: '/api/v1/projects/project_123',
                sourceIp: null,
                failureReason: null,
                metadata: {
                  changedFields: ['status'],
                  previousStatus: 'active',
                  projectName: 'Alpha',
                  status: 'archived',
                },
                occurredAt: '2026-05-11T10:00:00.000Z',
              },
              {
                id: 'audit_restore_1',
                eventType: 'projects.updated',
                outcome: 'success',
                actorUserId: 'user_123',
                actorSessionId: 'session_123',
                projectId: 'project_123',
                secretId: null,
                tokenId: null,
                route: '/api/v1/projects/project_123',
                sourceIp: null,
                failureReason: null,
                metadata: {
                  changedFields: ['status'],
                  previousStatus: 'archived',
                  projectName: 'Alpha',
                  status: 'active',
                },
                occurredAt: '2026-05-11T11:00:00.000Z',
              },
            ],
            nextCursor: null,
          },
        ],
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage,
      refetch,
    })

    render(<OrganizationActivityPage />)

    expect(screen.getByText(hasExactText('Archived Alpha.'))).toBeInTheDocument()
    expect(screen.getByText(hasExactText('Restored Alpha from the archive.'))).toBeInTheDocument()
    expect(screen.getAllByText('active').length).toBeGreaterThan(0)
    expect(screen.getAllByText('archived').length).toBeGreaterThan(0)
  })
})
