'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { projectsApi } from '@/lib/api/projects'
import { useAuth } from '@/lib/hooks/use-auth'
import { queryKeys } from '@/lib/query/keys'
import type {
  CreateAccessRequestInput,
  CreateProjectInput,
  ReviewAccessRequestInput,
  UpdateProjectInput,
} from '@/lib/types/api'

export function useProjectsQuery() {
  const auth = useAuth()
  const activeOrgId = auth.activeOrganization?.organization.id ?? null

  return useQuery({
    queryKey: queryKeys.projects.list(activeOrgId),
    queryFn: () => projectsApi.listProjects(),
    enabled: auth.status === 'authenticated' && Boolean(activeOrgId),
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectsApi.createProject(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
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
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.detail(updatedProject.project.id),
        }),
      ])
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => projectsApi.deleteProject(projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
  })
}

export function useCreateProjectAccessRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { projectId: string; input: CreateAccessRequestInput }) =>
      projectsApi.createAccessRequest(payload.projectId, payload.input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
      ])
    },
  })
}

export function useProjectAccessRequests(
  projectId: string | null,
  status?: 'pending' | 'approved' | 'denied' | 'rejected' | 'cancelled',
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.projectAccessRequests.list(projectId, status ?? 'all'),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to list access requests')
      }

      return projectsApi.listAccessRequests(projectId, status)
    },
    enabled: Boolean(projectId) && enabled,
  })
}

export function useReviewProjectAccessRequest(projectId?: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { requestId: string; input: ReviewAccessRequestInput }) =>
      projectsApi.reviewAccessRequest(payload.requestId, payload.input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.projectAccessRequests.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectMembers.list(projectId ?? null),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
      ])
    },
  })
}

export function useCreateSecretAccessRequest(projectId?: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { secretId: string }) => {
      if (!projectId) {
        throw new Error('projectId is required to request variable access')
      }

      return projectsApi.createSecretAccessRequest(projectId, payload.secretId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

export function useArchiveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => projectsApi.archiveProject(projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
  })
}

export function useUnarchiveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => projectsApi.unarchiveProject(projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
  })
}

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to load project details')
      }

      return projectsApi.getProject(projectId)
    },
    enabled: Boolean(projectId),
  })
}
