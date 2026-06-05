import type { SignedPolicy, AdmissionWebhooks } from './ome'

export interface PublishToken {
  id: string
  name: string
  token: string
  vhost: string
  app: string
  streamName: string
  createdAt: string
  expiresAt: string | null
  isRevoked: boolean
  lastUsedAt: string | null
  useCount: number
}

export interface AuthConfig {
  vhost: string
  app: string | null
  signedPolicy: SignedPolicy | null
  admissionWebhooks: AdmissionWebhooks | null
}

export interface TokenCreateInput {
  name: string
  vhost: string
  app: string
  streamName: string
  expiresInDays: number | null
}
