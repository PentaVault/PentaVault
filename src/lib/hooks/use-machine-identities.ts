'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { machineIdentitiesApi } from '@/lib/api/machine-identities'
import { queryKeys } from '@/lib/query/keys'
import type {
  CreateMachineIdentityAuthMethodInput,
  CreateMachineIdentityInput,
  MachineIdentityGrantRole,
  UpdateMachineIdentityInput,
} from '@/lib/types/api'

function useInvalidateMachineIdentities() {
  const queryClient = useQueryClient()
  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.machineIdentities.all })
  }, [queryClient])
}

export function useMachineIdentities(enabled = true) {
  return useQuery({
    queryKey: queryKeys.machineIdentities.list(),
    queryFn: () => machineIdentitiesApi.list(),
    enabled,
  })
}

export function useCreateMachineIdentity() {
  const invalidate = useInvalidateMachineIdentities()
  return useMutation({
    mutationFn: (input: CreateMachineIdentityInput) => machineIdentitiesApi.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateMachineIdentity() {
  const invalidate = useInvalidateMachineIdentities()
  return useMutation({
    mutationFn: (variables: { identityId: string; input: UpdateMachineIdentityInput }) =>
      machineIdentitiesApi.update(variables.identityId, variables.input),
    onSuccess: invalidate,
  })
}

export function useDeleteMachineIdentity() {
  const invalidate = useInvalidateMachineIdentities()
  return useMutation({
    mutationFn: (identityId: string) => machineIdentitiesApi.remove(identityId),
    onSuccess: invalidate,
  })
}

/** Only fetched once a row is expanded — most identities are never opened. */
export function useMachineIdentityAuthMethods(identityId: string | null) {
  return useQuery({
    queryKey: queryKeys.machineIdentities.authMethods(identityId ?? ''),
    queryFn: () => machineIdentitiesApi.listAuthMethods(identityId as string),
    enabled: Boolean(identityId),
  })
}

export function useCreateMachineIdentityAuthMethod() {
  const invalidate = useInvalidateMachineIdentities()
  return useMutation({
    mutationFn: (variables: { identityId: string; input: CreateMachineIdentityAuthMethodInput }) =>
      machineIdentitiesApi.createAuthMethod(variables.identityId, variables.input),
    onSuccess: invalidate,
  })
}

export function useSetMachineIdentityAuthMethodEnabled() {
  const invalidate = useInvalidateMachineIdentities()
  return useMutation({
    mutationFn: (variables: { identityId: string; authMethodId: string; enabled: boolean }) =>
      machineIdentitiesApi.setAuthMethodEnabled(
        variables.identityId,
        variables.authMethodId,
        variables.enabled
      ),
    onSuccess: invalidate,
  })
}

export function useDeleteMachineIdentityAuthMethod() {
  const invalidate = useInvalidateMachineIdentities()
  return useMutation({
    mutationFn: (variables: { identityId: string; authMethodId: string }) =>
      machineIdentitiesApi.removeAuthMethod(variables.identityId, variables.authMethodId),
    onSuccess: invalidate,
  })
}

export function useMachineIdentityProjectGrants(identityId: string | null) {
  return useQuery({
    queryKey: queryKeys.machineIdentities.projectGrants(identityId ?? ''),
    queryFn: () => machineIdentitiesApi.listProjectGrants(identityId as string),
    enabled: Boolean(identityId),
  })
}

export function useGrantMachineIdentityProject() {
  const invalidate = useInvalidateMachineIdentities()
  return useMutation({
    mutationFn: (variables: {
      identityId: string
      projectId: string
      role: MachineIdentityGrantRole
    }) =>
      machineIdentitiesApi.grantProject(variables.identityId, variables.projectId, variables.role),
    onSuccess: invalidate,
  })
}

export function useRevokeMachineIdentityProject() {
  const invalidate = useInvalidateMachineIdentities()
  return useMutation({
    mutationFn: (variables: { identityId: string; projectId: string }) =>
      machineIdentitiesApi.revokeProject(variables.identityId, variables.projectId),
    onSuccess: invalidate,
  })
}
