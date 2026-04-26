import type { ProjectRole, UserProject } from '@/lib/types/models'

type ProjectRoleContext = Pick<UserProject, 'effectiveRole' | 'membership' | 'orgRole'>

export function getEffectiveProjectRole(
  project: ProjectRoleContext | null | undefined
): ProjectRole | null {
  if (!project) {
    return null
  }

  if (project.effectiveRole) {
    return project.effectiveRole
  }

  if (project.orgRole === 'owner') {
    return 'owner'
  }

  if (project.membership?.role) {
    return project.membership.role
  }

  if (project.orgRole === 'readonly') {
    return 'readonly'
  }

  return 'developer'
}
