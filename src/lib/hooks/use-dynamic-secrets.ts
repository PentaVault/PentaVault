'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { dynamicSecretsApi } from '@/lib/api/dynamic-secrets'
import { queryKeys } from '@/lib/query/keys'
import type {
  CreateDynamicSecretInput,
  IssueDynamicSecretLeaseInput,
  UpdateDynamicSecretInput,
} from '@/lib/types/api'

export function useProjectDynamicSecrets(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectDynamicSecrets.list(projectId),
    queryFn: async () => {
      if (!projectId) throw new Error('projectId is required to list dynamic secrets')
      return dynamicSecretsApi.list(projectId)
    },
    enabled: enabled && Boolean(projectId),
  })
}

export function useDynamicSecretLeases(
  projectId: string | null,
  dynamicSecretId: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.projectDynamicSecrets.leases(projectId, dynamicSecretId),
    queryFn: async () => {
      if (!projectId || !dynamicSecretId) {
        throw new Error('projectId and dynamicSecretId are required to list leases')
      }
      return dynamicSecretsApi.listLeases(projectId, dynamicSecretId)
    },
    enabled: enabled && Boolean(projectId) && Boolean(dynamicSecretId),
  })
}

function useInvalidateDynamicSecrets() {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.projectDynamicSecrets.all })
  }
}

export function useCreateDynamicSecret(projectId: string | null) {
  const invalidate = useInvalidateDynamicSecrets()
  return useMutation({
    mutationFn: async (input: CreateDynamicSecretInput) => {
      if (!projectId) throw new Error('projectId is required to create a dynamic secret')
      return dynamicSecretsApi.create(projectId, input)
    },
    onSuccess: invalidate,
  })
}

export function useUpdateDynamicSecret(projectId: string | null) {
  const invalidate = useInvalidateDynamicSecrets()
  return useMutation({
    mutationFn: async (payload: { dynamicSecretId: string; input: UpdateDynamicSecretInput }) => {
      if (!projectId) throw new Error('projectId is required to update a dynamic secret')
      return dynamicSecretsApi.update(projectId, payload.dynamicSecretId, payload.input)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteDynamicSecret(projectId: string | null) {
  const invalidate = useInvalidateDynamicSecrets()
  return useMutation({
    mutationFn: async (dynamicSecretId: string) => {
      if (!projectId) throw new Error('projectId is required to delete a dynamic secret')
      return dynamicSecretsApi.remove(projectId, dynamicSecretId)
    },
    onSuccess: invalidate,
  })
}

export function useIssueDynamicSecretLease(projectId: string | null) {
  const invalidate = useInvalidateDynamicSecrets()
  return useMutation({
    mutationFn: async (payload: {
      dynamicSecretId: string
      input?: IssueDynamicSecretLeaseInput
    }) => {
      if (!projectId) throw new Error('projectId is required to issue a lease')
      return dynamicSecretsApi.issueLease(projectId, payload.dynamicSecretId, payload.input)
    },
    onSuccess: invalidate,
  })
}

export function useRevokeDynamicSecretLease(projectId: string | null) {
  const invalidate = useInvalidateDynamicSecrets()
  return useMutation({
    mutationFn: async (leaseId: string) => {
      if (!projectId) throw new Error('projectId is required to revoke a lease')
      return dynamicSecretsApi.revokeLease(projectId, leaseId)
    },
    onSuccess: invalidate,
  })
}
