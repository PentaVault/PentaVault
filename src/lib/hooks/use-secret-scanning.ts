'use client'

import { useMutation } from '@tanstack/react-query'

import { secretScanningApi } from '@/lib/api/secret-scanning'
import type { SecretScanInput } from '@/lib/types/api'

export function useScanContentForSecrets(projectId: string | null) {
  return useMutation({
    mutationFn: async (input: SecretScanInput) => {
      if (!projectId) throw new Error('projectId is required to scan content')
      return secretScanningApi.scan(projectId, input)
    },
  })
}
