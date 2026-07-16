'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { groupsApi } from '@/lib/api/groups'
import { queryKeys } from '@/lib/query/keys'
import type {
  CreateAccessGroupInput,
  GrantProjectAccessGroupInput,
  UpdateAccessGroupInput,
} from '@/lib/types/api'

export function useOrganizationAccessGroups(organizationId: string | null) {
  return useQuery({
    queryKey: queryKeys.organizationAccessGroups.list(organizationId),
    queryFn: () => {
      if (!organizationId) throw new Error('organizationId is required to list access groups')
      return groupsApi.list(organizationId)
    },
    enabled: Boolean(organizationId),
  })
}

export function useAccessGroupMembers(organizationId: string | null, groupId: string | null) {
  return useQuery({
    queryKey: queryKeys.organizationAccessGroups.members(organizationId, groupId),
    queryFn: () => {
      if (!organizationId || !groupId) throw new Error('organizationId and groupId are required')
      return groupsApi.listMembers(organizationId, groupId)
    },
    enabled: Boolean(organizationId && groupId),
  })
}

function useInvalidateOrganizationGroups(organizationId: string | null) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.organizationAccessGroups.list(organizationId),
    })
}

export function useCreateAccessGroup(organizationId: string | null) {
  const invalidate = useInvalidateOrganizationGroups(organizationId)
  return useMutation({
    mutationFn: (input: CreateAccessGroupInput) => {
      if (!organizationId) throw new Error('organizationId is required to create an access group')
      return groupsApi.create(organizationId, input)
    },
    onSuccess: invalidate,
  })
}

export function useUpdateAccessGroup(organizationId: string | null) {
  const invalidate = useInvalidateOrganizationGroups(organizationId)
  return useMutation({
    mutationFn: ({ groupId, input }: { groupId: string; input: UpdateAccessGroupInput }) => {
      if (!organizationId) throw new Error('organizationId is required to update an access group')
      return groupsApi.update(organizationId, groupId, input)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteAccessGroup(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) => {
      if (!organizationId) throw new Error('organizationId is required to delete an access group')
      return groupsApi.remove(organizationId, groupId)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizationAccessGroups.list(organizationId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projectAccessGroups.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
      ])
    },
  })
}

export function useAddAccessGroupMember(organizationId: string | null, groupId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => {
      if (!organizationId || !groupId) throw new Error('organizationId and groupId are required')
      return groupsApi.addMember(organizationId, groupId, userId)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizationAccessGroups.members(organizationId, groupId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizationAccessGroups.list(organizationId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
      ])
    },
  })
}

export function useRemoveAccessGroupMember(organizationId: string | null, groupId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => {
      if (!organizationId || !groupId) throw new Error('organizationId and groupId are required')
      return groupsApi.removeMember(organizationId, groupId, userId)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizationAccessGroups.members(organizationId, groupId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizationAccessGroups.list(organizationId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
      ])
    },
  })
}

export function useProjectAccessGroups(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.projectAccessGroups.list(projectId),
    queryFn: () => {
      if (!projectId) throw new Error('projectId is required to list project access groups')
      return groupsApi.listProject(projectId)
    },
    enabled: Boolean(projectId),
  })
}

export function useGrantProjectAccessGroup(projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, input }: { groupId: string; input: GrantProjectAccessGroupInput }) => {
      if (!projectId) throw new Error('projectId is required to grant project access')
      return groupsApi.grantProject(projectId, groupId, input)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.projectAccessGroups.list(projectId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
      ])
    },
  })
}

export function useRevokeProjectAccessGroup(projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) => {
      if (!projectId) throw new Error('projectId is required to revoke project access')
      return groupsApi.revokeProject(projectId, groupId)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.projectAccessGroups.list(projectId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
      ])
    },
  })
}
