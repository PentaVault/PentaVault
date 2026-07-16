import {
  createAccessGroupInputSchema,
  parseApiInput,
  parseApiResponse,
  projectAccessGroupsResponseSchema,
} from '@/lib/api/schemas'
import type { ProjectAccessGroupsResponse } from '@/lib/types/api'

const group = {
  id: 'group_platform',
  organizationId: 'org_1',
  name: 'Platform',
  slug: 'platform',
  description: 'Production operators',
  createdByUserId: 'user_owner',
  memberCount: 3,
  projectCount: 2,
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
}

describe('access group API schemas', () => {
  it('parses groups and read-only project grants without broadening the role', () => {
    const parsed = parseApiResponse<ProjectAccessGroupsResponse>(
      projectAccessGroupsResponseSchema,
      {
        groups: [group],
        grants: [
          {
            id: 'grant_1',
            projectId: 'project_1',
            groupId: group.id,
            role: 'readonly',
            grantedByUserId: 'user_owner',
            createdAt: group.createdAt,
            updatedAt: group.updatedAt,
            group: {
              id: group.id,
              organizationId: group.organizationId,
              name: group.name,
              slug: group.slug,
            },
          },
        ],
      }
    )

    expect(parsed.grants[0]?.role).toBe('readonly')
    expect(parsed.groups[0]?.memberCount).toBe(3)
  })

  it('requires safe lowercase slugs and bounded metadata', () => {
    expect(
      parseApiInput(createAccessGroupInputSchema, {
        name: 'Platform',
        slug: 'platform-team',
        description: null,
      }).slug
    ).toBe('platform-team')
    expect(() =>
      parseApiInput(createAccessGroupInputSchema, {
        name: 'Platform',
        slug: 'Platform Team',
      })
    ).toThrow()
  })
})
