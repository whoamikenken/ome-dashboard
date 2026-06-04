import { api } from './client'
import type { StreamPush, StreamPushed, OmeResponse } from '@/types/ome'

export async function startPush(vhost: string, app: string, data: StreamPush) {
  const res = await api.post<OmeResponse<StreamPushed>>(`/vhosts/${encodeURIComponent(vhost)}/apps/${encodeURIComponent(app)}:startPush`, data)
  return res.data
}

export async function stopPush(vhost: string, app: string, data: { id: string }) {
  const res = await api.post<OmeResponse<null>>(`/vhosts/${encodeURIComponent(vhost)}/apps/${encodeURIComponent(app)}:stopPush`, data)
  return res.data
}

export async function getPushState(vhost: string, app: string, data: { id: string }) {
  const res = await api.post<OmeResponse<StreamPushed>>(`/vhosts/${encodeURIComponent(vhost)}/apps/${encodeURIComponent(app)}:pushes`, data)
  return res.data
}
