import { api } from './client'
import type { OmeResponse } from '@/types/ome'

export async function getVHostStats(vhost: string) {
  const res = await api.get<OmeResponse<any>>(`/stats/current/vhosts/${encodeURIComponent(vhost)}`)
  return res.data
}

export async function getAppStats(vhost: string, app: string) {
  const res = await api.get<OmeResponse<any>>(`/stats/current/vhosts/${encodeURIComponent(vhost)}/apps/${encodeURIComponent(app)}`)
  return res.data
}

export async function getStreamStats(vhost: string, app: string, stream: string) {
  const res = await api.get<OmeResponse<any>>(`/stats/current/vhosts/${encodeURIComponent(vhost)}/apps/${encodeURIComponent(app)}/streams/${encodeURIComponent(stream)}`)
  return res.data
}
