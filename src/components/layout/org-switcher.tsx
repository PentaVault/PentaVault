'use client'

import { Check, ChevronsUpDown, Plus } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown'
import { useAuth } from '@/lib/hooks/use-auth'
import { useSwitchOrganization } from '@/lib/hooks/use-organizations'
import { cn } from '@/lib/utils/cn'

type OrgSwitcherProps = {
  onCreateOrganization: () => void
}

export function OrgSwitcher({ onCreateOrganization }: OrgSwitcherProps) {
  const auth = useAuth()
  const switchOrganization = useSwitchOrganization()
  const activeOrganization = auth.activeOrganization?.organization

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Switch organisation"
          className="ml-3 inline-flex h-9 min-w-[180px] max-w-[300px] cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 outline-none transition-colors duration-100 hover:border-border-strong focus-visible:outline-none"
          type="button"
        >
          <span className="truncate text-sm font-medium">
            {activeOrganization?.name ?? 'Select organisation'}
          </span>
          <ChevronsUpDown className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-[--radix-dropdown-menu-trigger-width] min-w-[200px]"
        role="menu"
      >
        {auth.organizations.map((entry) => {
          const isActive = entry.organization.id === activeOrganization?.id

          return (
            <DropdownMenuItem
              aria-checked={isActive}
              className="gap-3"
              key={`${entry.organization.id}:${entry.membership.id}`}
              onSelect={(event) => {
                event.preventDefault()
                if (!isActive) {
                  void switchOrganization.mutateAsync(entry.organization.id)
                }
              }}
              role="menuitemcheckbox"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {entry.organization.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  /{entry.organization.slug} · {entry.membership.role}
                </p>
              </div>
              <span
                className={cn('flex h-4 w-4 items-center justify-center', !isActive && 'opacity-0')}
              >
                <Check className="h-4 w-4 text-[#00c573]" />
              </span>
            </DropdownMenuItem>
          )
        })}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            onCreateOrganization()
          }}
          role="menuitem"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create organisation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
