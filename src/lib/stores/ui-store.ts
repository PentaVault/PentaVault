'use client'

import { create } from 'zustand'

import type { AuthApiKeyTokenType } from '@/lib/types/api'

type UiStoreState = {
  createOrganizationDialogOpen: boolean
  accountTokensActiveTab: AuthApiKeyTokenType
}

type UiStoreActions = {
  setCreateOrganizationDialogOpen: (open: boolean) => void
  setAccountTokensActiveTab: (tab: AuthApiKeyTokenType) => void
}

export type UiStore = UiStoreState & UiStoreActions

export const useUiStore = create<UiStore>()((set) => ({
  accountTokensActiveTab: 'command-line',
  createOrganizationDialogOpen: false,
  setAccountTokensActiveTab: (accountTokensActiveTab) => set({ accountTokensActiveTab }),
  setCreateOrganizationDialogOpen: (createOrganizationDialogOpen) =>
    set({ createOrganizationDialogOpen }),
}))
