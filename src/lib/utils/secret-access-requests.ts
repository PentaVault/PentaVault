import type { NotificationRecord } from '@/lib/types/api'
import type { ProxyToken, Secret, SecretAccessRequest, UserSecretAccess } from '@/lib/types/models'

export type PendingSecretRequest = {
  id: string
  secretId: string
  secretName: string
  requesterId: string
  createdAt: string
}

export function buildPendingSecretRequestsByUserFromRecords({
  requests,
  secrets,
  access = [],
  tokens,
}: {
  requests: SecretAccessRequest[]
  secrets: Secret[]
  access?: UserSecretAccess[]
  tokens: ProxyToken[]
}): Map<string, PendingSecretRequest[]> {
  const assignedSecretKeys = new Set(
    access.length > 0
      ? access
          .filter((grant) => grant.status === 'active')
          .map((grant) => `${grant.userId}:${grant.secretId}`)
      : tokens
          .filter((token) => token.revokedAt === null)
          .map((token) => `${token.userId}:${token.secretId}`)
  )
  const pendingRequestsByUserId = new Map<string, PendingSecretRequest[]>()

  for (const request of requests) {
    if (
      request.status !== 'pending' ||
      assignedSecretKeys.has(`${request.requesterId}:${request.secretId}`)
    ) {
      continue
    }

    const requestsForUser = pendingRequestsByUserId.get(request.requesterId) ?? []
    if (!requestsForUser.some((entry) => entry.secretId === request.secretId)) {
      requestsForUser.push({
        id: request.id,
        secretId: request.secretId,
        secretName: secrets.find((secret) => secret.id === request.secretId)?.name ?? 'Unknown',
        requesterId: request.requesterId,
        createdAt: request.createdAt,
      })
      pendingRequestsByUserId.set(request.requesterId, requestsForUser)
    }
  }

  return pendingRequestsByUserId
}

export function buildPendingSecretRequestsByUser({
  notifications,
  projectId,
  secrets,
  tokens,
}: {
  notifications: NotificationRecord[]
  projectId: string
  secrets: Secret[]
  tokens: ProxyToken[]
}): Map<string, PendingSecretRequest[]> {
  const assignedSecretKeys = new Set(tokens.map((token) => `${token.userId}:${token.secretId}`))
  const reviewedSecretRequestKeys = new Set<string>()

  for (const notification of notifications) {
    const data = notification.data
    const notificationProjectId = typeof data.projectId === 'string' ? data.projectId : null
    const secretId = typeof data.secretId === 'string' ? data.secretId : null
    if (
      notificationProjectId !== projectId ||
      !secretId ||
      notification.type !== 'secret_access_status'
    ) {
      continue
    }

    if (data.requestStatus === 'approved' || data.requestStatus === 'rejected') {
      reviewedSecretRequestKeys.add(`${notification.userId}:${secretId}`)
    }
  }

  const pendingRequestsByUserId = new Map<string, PendingSecretRequest[]>()
  for (const notification of notifications) {
    const data = notification.data
    const notificationProjectId = typeof data.projectId === 'string' ? data.projectId : null
    const secretId = typeof data.secretId === 'string' ? data.secretId : null
    const requesterId = typeof data.requesterId === 'string' ? data.requesterId : null
    if (
      notificationProjectId !== projectId ||
      !secretId ||
      !requesterId ||
      data.requestStatus !== 'pending' ||
      (notification.type !== 'secret_access_request' &&
        notification.type !== 'secret_access_status') ||
      assignedSecretKeys.has(`${requesterId}:${secretId}`) ||
      reviewedSecretRequestKeys.has(`${requesterId}:${secretId}`)
    ) {
      continue
    }

    const requests = pendingRequestsByUserId.get(requesterId) ?? []
    if (!requests.some((request) => request.secretId === secretId)) {
      requests.push({
        id: notification.id,
        secretId,
        secretName:
          typeof data.secretName === 'string'
            ? data.secretName
            : (secrets.find((secret) => secret.id === secretId)?.name ?? 'Unknown'),
        requesterId,
        createdAt: notification.createdAt,
      })
      pendingRequestsByUserId.set(requesterId, requests)
    }
  }

  return pendingRequestsByUserId
}
