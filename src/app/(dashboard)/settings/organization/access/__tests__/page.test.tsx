import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { organizationsApi } from '@/lib/api/organizations'

import OrgAccessControlPage from '../page'

const refresh = vi.fn()
let orgSettings = {
  membersCanSeeAllProjects: true,
  membersCanRequestProjectAccess: true,
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}))

vi.mock('@/lib/api/organizations', () => ({
  organizationsApi: {
    updateAccessControl: vi.fn(async () => ({
      organization: {
        membersCanSeeAllProjects: false,
        membersCanRequestProjectAccess: false,
      },
    })),
  },
}))

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    refresh,
    activeOrganization: {
      organization: {
        id: 'org_123',
        name: 'Acme',
        ...orgSettings,
      },
      membership: {
        role: 'owner',
      },
    },
  }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }),
}))

describe('OrgAccessControlPage', () => {
  beforeEach(() => {
    orgSettings = {
      membersCanSeeAllProjects: true,
      membersCanRequestProjectAccess: true,
    }
    refresh.mockReset()
    vi.mocked(organizationsApi.updateAccessControl).mockClear()
  })

  it('nests project access requests under all-project visibility', () => {
    render(<OrgAccessControlPage />)

    expect(screen.getByText('Members can see all projects')).toBeInTheDocument()
    expect(screen.getByText('Members can request project access')).toBeInTheDocument()
  })

  it('hides project access requests when all-project visibility is disabled', () => {
    orgSettings = {
      membersCanSeeAllProjects: false,
      membersCanRequestProjectAccess: false,
    }

    render(<OrgAccessControlPage />)

    expect(screen.getByText('Members can see all projects')).toBeInTheDocument()
    expect(screen.queryByText('Members can request project access')).not.toBeInTheDocument()
  })

  it('turns off project access requests when all-project visibility is disabled', async () => {
    render(<OrgAccessControlPage />)

    fireEvent.click(screen.getByRole('switch', { name: 'Toggle member project visibility' }))

    await waitFor(() => {
      expect(organizationsApi.updateAccessControl).toHaveBeenCalledWith('org_123', {
        membersCanSeeAllProjects: false,
        membersCanRequestProjectAccess: false,
      })
    })
  })
})
