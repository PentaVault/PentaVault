'use client'

import { create } from 'zustand'

import type { AuthApiKeyTokenType } from '@/lib/types/api'

type UiStoreState = {
  createOrganizationDialogOpen: boolean
  accountTokensActiveTab: AuthApiKeyTokenType
  sidebarCollapsed: boolean
}

type UiStoreActions = {
  setCreateOrganizationDialogOpen: (open: boolean) => void
  setAccountTokensActiveTab: (tab: AuthApiKeyTokenType) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarCollapsed: () => void
}

export type UiStore = UiStoreState & UiStoreActions

export const useUiStore = create<UiStore>()((set) => ({
  accountTokensActiveTab: 'command-line',
  createOrganizationDialogOpen: false,
  sidebarCollapsed: false,
  setAccountTokensActiveTab: (accountTokensActiveTab) => set({ accountTokensActiveTab }),
  setCreateOrganizationDialogOpen: (createOrganizationDialogOpen) =>
    set({ createOrganizationDialogOpen }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))
