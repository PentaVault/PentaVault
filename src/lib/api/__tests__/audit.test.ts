import { auditApi } from '@/lib/api/audit'
import { apiClient } from '@/lib/api/client'

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

describe('audit API', () => {
  it('requests a bounded blob export with filters', async () => {
    const blob = new Blob(['event_id,event_type'])
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: blob })

    await expect(
      auditApi.exportProjectAudit('project_1', {
        format: 'csv',
        maxRecords: 5000,
        outcome: 'failure',
      })
    ).resolves.toBe(blob)

    expect(apiClient.get).toHaveBeenCalledWith('/v1/projects/project_1/audit/export', {
      params: { format: 'csv', maxRecords: 5000, outcome: 'failure' },
      responseType: 'blob',
    })
  })
})
