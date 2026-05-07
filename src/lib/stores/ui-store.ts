'use client'

import { create } from 'zustand'

type UiStoreState = {
  createOrganizationDialogOpen: boolean
}

type UiStoreActions = {
  setCreateOrganizationDialogOpen: (open: boolean) => void
}

export type UiStore = UiStoreState & UiStoreActions

export const useUiStore = create<UiStore>()((set) => ({
  createOrganizationDialogOpen: false,
  setCreateOrganizationDialogOpen: (createOrganizationDialogOpen) =>
    set({ createOrganizationDialogOpen }),
}))
