import { authApi } from '@/lib/api/auth'
import type {
  AuthDeleteOrganizationInput,
  AuthOrganizationMembership,
  AuthUpdateOrganizationInput,
} from '@/lib/types/auth'

export const organizationsApi = {
  async list(): Promise<{ organizations: AuthOrganizationMembership[] }> {
    return authApi.listOrganizations()
  },

  async switch(
    organizationId: string
  ): Promise<{ activeOrganizationId: string | null; activeOrganizationSlug: string | null }> {
    return authApi.setActiveOrganization({ organizationId })
  },

  async update(input: AuthUpdateOrganizationInput): Promise<void> {
    await authApi.updateOrganization(input)
  },

  async updateAccessControl(
    organizationId: string,
    input: {
      membersCanSeeAllProjects?: boolean
      membersCanRequestProjectAccess?: boolean
    }
  ): Promise<{
    organization: {
      membersCanSeeAllProjects: boolean
      membersCanRequestProjectAccess: boolean
    }
  }> {
    const response = await authApi.updateOrganizationAccessControl(organizationId, input)
    return response
  },

  async delete(input: AuthDeleteOrganizationInput): Promise<void> {
    await authApi.deleteOrganization(input)
  },
}
