import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ProjectWebhooks } from '../project-webhooks'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  test: vi.fn(),
  retry: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  refetchDeliveries: vi.fn(),
}))

const webhook = {
  id: 'wh_1',
  projectId: 'project_1',
  environmentId: 'env_prod',
  name: 'Production deploy',
  endpointHost: 'hooks.example.com',
  folderPath: '/services',
  eventTypes: ['secrets.created', 'secrets.updated'],
  enabled: true,
  maxAttempts: 5,
  lastStatus: 'succeeded',
  lastDeliveryAt: '2026-07-16T00:00:00.000Z',
  lastError: null,
  createdByUserId: 'user_1',
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
  hasSigningSecret: true,
} as const

vi.mock('@/lib/hooks/use-project-configuration', () => ({
  useProjectEnvironments: () => ({
    data: {
      environments: [
        {
          id: 'env_prod',
          projectId: 'project_1',
          name: 'Production',
          slug: 'production',
          color: null,
          isDefault: true,
          createdAt: '2026-07-16T00:00:00.000Z',
        },
      ],
    },
  }),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }),
}))

vi.mock('@/lib/hooks/use-webhooks', () => ({
  useProjectWebhooks: () => ({
    data: { webhooks: [webhook], supportedEvents: webhook.eventTypes },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useWebhookDeliveries: () => ({
    data: {
      deliveries: [
        {
          id: 'whd_1',
          webhookId: 'wh_1',
          projectId: 'project_1',
          eventId: 'whe_1',
          eventType: 'secrets.updated',
          payload: {},
          status: 'dead_letter',
          attemptCount: 5,
          nextAttemptAt: null,
          lastAttemptAt: '2026-07-16T00:00:00.000Z',
          deliveredAt: null,
          responseStatus: 503,
          lastError: 'Webhook endpoint returned HTTP 503.',
          createdAt: '2026-07-16T00:00:00.000Z',
          updatedAt: '2026-07-16T00:00:00.000Z',
        },
      ],
    },
    isLoading: false,
    isFetching: false,
    refetch: mocks.refetchDeliveries,
  }),
  useCreateWebhook: () => ({ isPending: false, mutateAsync: mocks.create }),
  useUpdateWebhook: () => ({ isPending: false, mutateAsync: mocks.update }),
  useDeleteWebhook: () => ({ isPending: false, mutateAsync: mocks.remove }),
  useTestWebhook: () => ({ isPending: false, mutateAsync: mocks.test }),
  useRetryWebhookDelivery: () => ({ isPending: false, mutateAsync: mocks.retry }),
}))

describe('ProjectWebhooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.test.mockResolvedValue({ delivery: { status: 'succeeded' } })
    mocks.retry.mockResolvedValue({ delivery: { status: 'succeeded' } })
    mocks.create.mockResolvedValue({ webhook })
  })

  it('shows sanitized configuration and supports test and dead-letter replay', async () => {
    render(<ProjectWebhooks projectId="project_1" />)

    expect(screen.getByText('hooks.example.com')).toBeInTheDocument()
    expect(screen.queryByText(/\/deploy/)).not.toBeInTheDocument()
    expect(screen.getByText('Signed')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Test' }))
    await waitFor(() => expect(mocks.test).toHaveBeenCalledWith('wh_1'))

    fireEvent.click(screen.getByRole('button', { name: 'Deliveries' }))
    expect(await screen.findByText('Webhook endpoint returned HTTP 503.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(mocks.retry).toHaveBeenCalledWith('whd_1'))
  })

  it('creates a scoped webhook without exposing its signing secret', async () => {
    render(<ProjectWebhooks projectId="project_1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Add webhook' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Release hook' } })
    fireEvent.change(screen.getByLabelText('Endpoint URL'), {
      target: { value: 'https://release.example.com/hook' },
    })
    fireEvent.change(screen.getByLabelText('Signing secret'), {
      target: { value: 'strong-signing-secret' },
    })
    const submitButtons = screen.getAllByRole('button', { name: 'Add webhook' })
    fireEvent.click(submitButtons.at(-1) as HTMLElement)

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Release hook',
          endpointUrl: 'https://release.example.com/hook',
          signingSecret: 'strong-signing-secret',
          folderPath: '/',
          maxAttempts: 5,
        })
      )
    )
    expect(screen.queryByDisplayValue('strong-signing-secret')).not.toBeInTheDocument()
  })
})
