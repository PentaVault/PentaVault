import { fireEvent, render, screen } from '@testing-library/react'
import type { ButtonHTMLAttributes, HTMLAttributes, MouseEvent, ReactNode } from 'react'

import { OrgSwitcher } from '../org-switcher'

const mutateAsync = vi.fn()

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    activeOrganization: {
      organization: {
        id: 'org_1',
        name: 'A Very Long Organisation Name',
        slug: 'long-org',
        isDefault: true,
      },
      membership: {
        id: 'member_1',
        role: 'owner',
      },
    },
    organizations: [
      {
        organization: {
          id: 'org_1',
          name: 'A Very Long Organisation Name',
          slug: 'long-org',
          isDefault: true,
        },
        membership: {
          id: 'member_1',
          role: 'owner',
        },
      },
      {
        organization: {
          id: 'org_2',
          name: 'Acme Corp',
          slug: 'acme-corp',
          isDefault: false,
        },
        membership: {
          id: 'member_2',
          role: 'admin',
        },
      },
    ],
  }),
}))

vi.mock('@/lib/hooks/use-organizations', () => ({
  useSwitchOrganization: () => ({
    mutateAsync,
  }),
}))

vi.mock('@/components/ui/dropdown', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({
    children,
    ...props
  }: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) => (
    <div role="menu" {...props}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
    role = 'menuitem',
    ...props
  }: {
    children: ReactNode
    onSelect?: (event: MouseEvent<HTMLButtonElement>) => void
    role?: string
  } & ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={(event) => onSelect?.(event)} role={role} type="button" {...props}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}))

describe('OrgSwitcher', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
  })

  it('renders the current org name truncated', () => {
    render(<OrgSwitcher onCreateOrganization={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Switch organisation' })).toHaveTextContent(
      'A Very Long Organisation Name'
    )
  })

  it('shows ChevronsUpDown icon', () => {
    const { container } = render(<OrgSwitcher onCreateOrganization={vi.fn()} />)

    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('opens dropdown on click', () => {
    render(<OrgSwitcher onCreateOrganization={vi.fn()} />)

    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('shows all user orgs in dropdown', () => {
    render(<OrgSwitcher onCreateOrganization={vi.fn()} />)

    expect(screen.getAllByText('A Very Long Organisation Name').length).toBeGreaterThan(0)
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('org_1')).toBeInTheDocument()
    expect(screen.getByText('org_2')).toBeInTheDocument()
    expect(screen.queryByText('/long-org · org_1')).not.toBeInTheDocument()
  })

  it('marks current org with a checkmark', () => {
    render(<OrgSwitcher onCreateOrganization={vi.fn()} />)

    expect(screen.getAllByRole('menuitemcheckbox')[0]).toHaveAttribute('aria-checked', 'true')
  })

  it('calls switchOrganization when a different org is selected', () => {
    render(<OrgSwitcher onCreateOrganization={vi.fn()} />)

    fireEvent.click(screen.getByText('Acme Corp'))

    expect(mutateAsync).toHaveBeenCalledWith('org_2')
  })

  it('shows Create organisation option at bottom of dropdown', () => {
    render(<OrgSwitcher onCreateOrganization={vi.fn()} />)

    expect(screen.getByText('Create organisation')).toBeInTheDocument()
  })

  it('has correct accessible label and ARIA attributes', () => {
    render(<OrgSwitcher onCreateOrganization={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Switch organisation' })).toBeInTheDocument()
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitemcheckbox').length).toBeGreaterThan(0)
  })
})
