import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ProjectAuditLogStreams } from '../project-audit-log-streams'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  refetch: vi.fn(),
}))

const stream = {
  id: 'als_1',
  projectId: 'project_1',
  name: 'datadog',
  endpointUrl: 'https://http-intake.logs.datadoghq.com/api/v2/logs',
  endpointHost: 'http-intake.logs.datadoghq.com',
  hasToken: true,
  enabled: true,
  lastStatus: 202,
  lastDeliveryAt: '2026-07-20T00:00:00.000Z',
  lastError: null,
  createdByUserId: 'user_1',
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
} as const

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }),
}))

vi.mock('@/lib/hooks/use-audit-log-streams', () => ({
  useProjectAuditLogStreams: () => ({
    data: { streams: [stream] },
    isError: false,
    refetch: mocks.refetch,
  }),
  useCreateAuditLogStream: () => ({ isPending: false, mutateAsync: mocks.create }),
  useUpdateAuditLogStream: () => ({ isPending: false, mutateAsync: mocks.update }),
  useDeleteAuditLogStream: () => ({ isPending: false, mutateAsync: mocks.remove }),
}))

describe('ProjectAuditLogStreams', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({ stream })
    mocks.update.mockResolvedValue({ stream })
    mocks.remove.mockResolvedValue({ deleted: true })
  })

  it('renders streams with host, auth, and delivery status but never a token', () => {
    render(<ProjectAuditLogStreams projectId="project_1" />)
    expect(screen.getByText('datadog')).toBeInTheDocument()
    expect(screen.getByText('http-intake.logs.datadoghq.com')).toBeInTheDocument()
    expect(screen.getByText('Authenticated')).toBeInTheDocument()
    expect(screen.getByText('HTTP 202')).toBeInTheDocument()
    expect(screen.queryByText(/Bearer/)).not.toBeInTheDocument()
  })

  it('creates a stream with the entered endpoint', async () => {
    render(<ProjectAuditLogStreams projectId="project_1" />)
    fireEvent.click(screen.getByRole('button', { name: 'New stream' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'splunk' } })
    fireEvent.change(screen.getByLabelText('Endpoint URL'), {
      target: { value: 'https://splunk.example.com/ingest' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create stream' }))
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'splunk',
          endpointUrl: 'https://splunk.example.com/ingest',
        })
      )
    )
  })

  it('toggles a stream enabled state', async () => {
    render(<ProjectAuditLogStreams projectId="project_1" />)
    fireEvent.click(screen.getByRole('switch', { name: 'Toggle datadog' }))
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith({ streamId: 'als_1', input: { enabled: false } })
    )
  })

  it('requires an endpoint URL before submitting', async () => {
    render(<ProjectAuditLogStreams projectId="project_1" />)
    fireEvent.click(screen.getByRole('button', { name: 'New stream' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'incomplete' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create stream' }))
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith('An endpoint URL is required.')
    )
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
