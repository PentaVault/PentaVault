import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ProjectSecretScanner } from '../project-secret-scanner'

const mocks = vi.hoisted(() => ({
  scan: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }),
}))

vi.mock('@/lib/hooks/use-secret-scanning', () => ({
  useScanContentForSecrets: () => ({ isPending: false, mutateAsync: mocks.scan }),
}))

describe('ProjectSecretScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('scans pasted content and lists redacted findings', async () => {
    mocks.scan.mockResolvedValue({
      findings: [
        {
          ruleId: 'github_pat',
          description: 'GitHub personal access token',
          severity: 'critical',
          line: 2,
          column: 7,
          redactedMatch: 'ghp_****ef',
        },
      ],
      scanned: { bytes: 60, findingCount: 1 },
    })

    render(<ProjectSecretScanner projectId="project_1" />)
    fireEvent.change(screen.getByPlaceholderText(/Paste content to scan/), {
      target: { value: 'token=ghp_secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))

    await waitFor(() => expect(mocks.scan).toHaveBeenCalledWith({ content: 'token=ghp_secret' }))
    expect(await screen.findByText('GitHub personal access token')).toBeInTheDocument()
    expect(screen.getByText(/ghp_\*+ef/)).toBeInTheDocument()
    expect(screen.getByText(/1 potential secret found/)).toBeInTheDocument()
  })

  it('shows a clean result when nothing is found', async () => {
    mocks.scan.mockResolvedValue({ findings: [], scanned: { bytes: 10, findingCount: 0 } })
    render(<ProjectSecretScanner projectId="project_1" />)
    fireEvent.change(screen.getByPlaceholderText(/Paste content to scan/), {
      target: { value: 'nothing here' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))
    await waitFor(() => expect(mocks.scan).toHaveBeenCalled())
    expect(
      await screen.findByText(/No secrets detected in the scanned content/)
    ).toBeInTheDocument()
  })

  it('does not scan empty content', () => {
    render(<ProjectSecretScanner projectId="project_1" />)
    // Button is disabled with empty content, so clicking does nothing.
    const button = screen.getByRole('button', { name: 'Scan' })
    expect(button).toBeDisabled()
    expect(mocks.scan).not.toHaveBeenCalled()
  })
})
