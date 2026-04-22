'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { teamApi } from '@/lib/api/team'
import type { CreateProjectMemberInput, UpdateProjectMemberInput } from '@/lib/types/api'

export function useProjectMembers(projectId: string | null) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error('projectId is required to list project members')
      }

      return teamApi.listMembers(projectId)
    },
    enabled: Boolean(projectId),
  })
}

export function useOrganizationMembers(organizationId: string | null) {
  return useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('organizationId is required to list organization members')
      }

      return teamApi.listOrganizationMembers(organizationId)
    },
    enabled: Boolean(organizationId),
  })
}

export function useAddProjectMember(projectId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProjectMemberInput) => {
      if (!projectId) {
        throw new Error('projectId is required to add project members')
      }

      return teamApi.addMember(projectId, input)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
    },
  })
}

export function useUpdateProjectMember(projectId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { userId: string; input: UpdateProjectMemberInput }) => {
      if (!projectId) {
        throw new Error('projectId is required to update project members')
      }

      return teamApi.updateMember(projectId, payload.userId, payload.input)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
    },
  })
}

export function useRemoveProjectMember(projectId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!projectId) {
        throw new Error('projectId is required to remove project members')
      }

      return teamApi.removeMember(projectId, userId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
    },
  })
}
