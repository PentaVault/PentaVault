'use client'

import { useMutation } from '@tanstack/react-query'

import { secretsApi } from '@/lib/api/secrets'

export function useSecrets() {
  return {
    createSecret: useMutation({
      mutationFn: secretsApi.createSecret,
    }),
    importSecrets: useMutation({
      mutationFn: secretsApi.importSecrets,
    }),
  }
}
