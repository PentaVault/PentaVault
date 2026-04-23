'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { projectsApi } from '@/lib/api/projects'
import { useAuth } from '@/lib/hooks/use-auth'
import type {
  CreateAccessRequestInput,
  CreateProjectInput,
  UpdateProjectInput,
} from '@/lib/types/api'

export function useProjectsQuery() {
  const auth = useAuth()
  const activeOrgId = auth.activeOrganization?.organization.id ?? null

  return useQuery({
    queryKey: ['projects', activeOrgId],
    queryFn: () => projectsApi.listProjects(),
    enabled: auth.status === 'authenticated' && Boolean(activeOrgId),
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectsApi.createProject(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { projectId: string; input: UpdateProjectInput }) =>
      projectsApi.updateProject(payload.projectId, payload.input),
    onSuccess: async (updatedProject) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['project', updatedProject.project.id] }),
      ])
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => projectsApi.deleteProject(projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useCreateProjectAccessRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { projectId: string; input: CreateAccessRequestInput }) =>
      projectsApi.createAccessRequest(payload.projectId, payload.input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useArchiveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => projectsApi.archiveProject(projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUnarchiveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => projectsApi.unarchiveProject(projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to load project details')
      }

      return projectsApi.getProject(projectId)
    },
    enabled: Boolean(projectId),
  })
}
