import { apiClient } from '@/lib/api/client'
import type {
  CreateProbableLeakAlertInput,
  CreateProbableLeakAlertResponse,
  RotationRecommendationsResponse,
  SecurityAlertsResponse,
  UpdateSecurityAlertInput,
  UpdateSecurityAlertResponse,
} from '@/lib/types/api'

export const securityApi = {
  async listAlerts(projectId: string): Promise<SecurityAlertsResponse> {
    const response = await apiClient.get<SecurityAlertsResponse>(`/v1/projects/${projectId}/alerts`)
    return response.data
  },

  async createProbableLeakAlert(
    projectId: string,
    input: CreateProbableLeakAlertInput
  ): Promise<CreateProbableLeakAlertResponse> {
    const response = await apiClient.post<CreateProbableLeakAlertResponse>(
      `/v1/projects/${projectId}/alerts/probable-leak`,
      input
    )
    return response.data
  },

  async updateAlert(
    projectId: string,
    alertId: string,
    input: UpdateSecurityAlertInput
  ): Promise<UpdateSecurityAlertResponse> {
    const response = await apiClient.patch<UpdateSecurityAlertResponse>(
      `/v1/projects/${projectId}/alerts/${alertId}`,
      input
    )
    return response.data
  },

  async listRecommendations(projectId: string): Promise<RotationRecommendationsResponse> {
    const response = await apiClient.get<RotationRecommendationsResponse>(
      `/v1/projects/${projectId}/recommendations`
    )
    return response.data
  },
}
