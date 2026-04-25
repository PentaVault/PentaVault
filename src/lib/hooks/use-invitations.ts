'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { invitationsApi } from '@/lib/api/invitations'
import type { SendOrgInvitationInput } from '@/lib/types/api'

export function useVerifyInvitation(token: string) {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: () => invitationsApi.verify(token),
    enabled: Boolean(token),
    retry: false,
  })
}

export function useSendOrgInvitation(organizationId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SendOrgInvitationInput) => {
      if (!organizationId) {
        throw new Error('organizationId is required to send invitations')
      }

      return invitationsApi.send(organizationId, input)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] })
      await queryClient.invalidateQueries({
        queryKey: ['organization-invitations', organizationId],
      })
    },
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (token: string) => invitationsApi.accept(token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
      await queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}

export function useAcceptInvitationById() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: string) => invitationsApi.acceptById(invitationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
      await queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}

export function useRejectInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (token: string) => invitationsApi.reject(token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useRejectInvitationById() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: string) => invitationsApi.rejectById(invitationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useRevokeInvitation(organizationId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (invitationId: string) => {
      if (!organizationId) {
        throw new Error('organizationId is required to revoke invitations')
      }

      return invitationsApi.revoke(organizationId, invitationId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] })
    },
  })
}

export function useResendInvitation(organizationId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (invitationId: string) => {
      if (!organizationId) {
        throw new Error('organizationId is required to resend invitations')
      }

      return invitationsApi.resend(organizationId, invitationId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] })
    },
  })
}
